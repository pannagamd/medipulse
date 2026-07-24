import re
from itertools import combinations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.health_profile import HealthProfile
from app.models.interaction import DrugInteraction
from app.models.medicine import Medicine, MedicineAlias
from app.schemas.common import SourceInfo
from app.schemas.interaction import InteractionResult, ProfileWarning, ResolvedMedicine, Severity
from app.services.profile_safety_service import ProfileSafetyService
from app.services.text import normalize_key, split_values

SEVERITY_RANK: dict[Severity, int] = {
    "safe": 0,
    "unknown": 1,
    "moderate": 2,
    "high": 3,
    "dangerous": 3,
}

# Compiled UUID regex: 8-4-4-4-12 hexadecimal characters
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _is_uuid(value: str) -> bool:
    """Return True when *value* is a standard UUID string (8-4-4-4-12 format)."""
    return bool(_UUID_RE.match(value))


class InteractionService:
    def __init__(self, db: Session):
        self.db = db

    def analyze(
        self,
        medicines: list[str],
        user_id: str | None = None,
    ) -> tuple[list[InteractionResult], list[ResolvedMedicine], list[ProfileWarning], Severity]:
        resolved = [self._resolve_medicine(value) for value in medicines]
        results: list[InteractionResult] = []
        for drug_a, drug_b in combinations(resolved, 2):
            results.append(self._check_pair(
                drug_a.resolved_name, drug_b.resolved_name,
                input_a=drug_a.input, input_b=drug_b.input,
            ))
        warnings = self._profile_warnings(resolved, user_id) if user_id else []
        warnings.extend(self._duplicate_active_ingredient_warnings(resolved))
        overall = self._overall_severity(results, warnings)
        return results, resolved, warnings, overall

    def _resolve_name(self, value: str) -> str:
        return self._resolve_medicine(value).resolved_name

    def _resolve_medicine(self, value: str) -> ResolvedMedicine:
        """Resolve a free-text medicine name (or ID) to a Medicine row.

        Resolution order:
        1. If *value* looks like a UUID (8-4-4-4-12 hex), try an exact PK
           lookup.  This supports clients that store and submit medicine IDs
           directly, which is a valid and tested API use case.
        2. Otherwise (and as fallback) resolve by generic_name / brand_name /
           alias using a case-insensitive partial match.

        The original code did ``db.get(Medicine, value)`` for every input
        regardless of format.  A user typing a free-text name that happened to
        be UUID-shaped would silently get back the wrong medicine.  The UUID
        guard below closes that hole.
        """
        value = value.strip()

        # Step 1: UUID-shaped input → try exact PK lookup
        if _is_uuid(value):
            medicine = self.db.get(Medicine, value)
            if medicine:
                return self._to_resolved(value, medicine)

        # Step 2: Name-based resolution (generic_name, brand_name, alias)
        pattern = f"%{value}%"
        medicine = self.db.scalar(
            select(Medicine)
            .outerjoin(MedicineAlias)
            .where(
                or_(
                    Medicine.generic_name.ilike(pattern),
                    Medicine.brand_name.ilike(pattern),
                    MedicineAlias.alias.ilike(pattern),
                )
            )
            .limit(1)
        )
        if medicine:
            return self._to_resolved(value, medicine)
        return ResolvedMedicine(input=value, resolved_name=value, matched=False)

    def _check_pair(
        self,
        drug_a: str,
        drug_b: str,
        input_a: str | None = None,
        input_b: str | None = None,
    ) -> InteractionResult:
        """Look up an interaction between two drugs, trying multiple key strategies.

        Strategy order:
        1. Exact key match on resolved names (e.g. 'warfarin sodium' vs 'aspirin + dipyridamole')
        2. Exact key match using the user's original input (e.g. 'warfarin' vs 'aspirin')
        3. Partial/LIKE match: look for any interaction row where both keys are
           contained-in or contain the resolved/input keys. This handles the common
           case where the DB has 'aspirin' but the resolved name is 'aspirin + dipyridamole'.
        """
        from sqlalchemy import or_

        def _try_exact(ka: str, kb: str) -> DrugInteraction | None:
            if not ka or not kb:
                return None
            if ka > kb:
                ka, kb = kb, ka
            return self.db.scalar(
                select(DrugInteraction).where(
                    DrugInteraction.drug_a_key == ka,
                    DrugInteraction.drug_b_key == kb,
                )
            )

        def _try_partial(ka: str, kb: str) -> DrugInteraction | None:
            """Find rows where the stored keys START WITH the given keys.
            e.g. stored 'aspirin' should match input key 'aspirin + dipyridamole'.
            """
            if not ka or not kb:
                return None
            return self.db.scalar(
                select(DrugInteraction).where(
                    or_(
                        # case A: ka matches drug_a_key, kb matches drug_b_key
                        (
                            (DrugInteraction.drug_a_key.startswith(ka) | DrugInteraction.drug_a_key.contains(ka))
                            & (DrugInteraction.drug_b_key.startswith(kb) | DrugInteraction.drug_b_key.contains(kb))
                        ),
                        # case B: swapped
                        (
                            (DrugInteraction.drug_a_key.startswith(kb) | DrugInteraction.drug_a_key.contains(kb))
                            & (DrugInteraction.drug_b_key.startswith(ka) | DrugInteraction.drug_b_key.contains(ka))
                        ),
                    )
                ).limit(1)
            )

        key_a_resolved = normalize_key(drug_a)
        key_b_resolved = normalize_key(drug_b)
        key_a_input = normalize_key(input_a) if input_a else key_a_resolved
        key_b_input = normalize_key(input_b) if input_b else key_b_resolved

        # Strategy 1: exact match on resolved names
        row = _try_exact(key_a_resolved, key_b_resolved)

        # Strategy 2: exact match using original input
        if not row and (key_a_input != key_a_resolved or key_b_input != key_b_resolved):
            row = _try_exact(key_a_input, key_b_input)

        # Strategy 3: partial match — try resolved names first, then inputs
        if not row:
            row = _try_partial(key_a_input, key_b_input)

        if not row:
            return InteractionResult(
                drug_a=drug_a,
                drug_b=drug_b,
                severity="unknown",
                explanation="No explicit interaction record is available in the configured datasets.",
                recommendations=["Consult a qualified clinician or pharmacist before combining these medicines."],
                sources=[],
                confidence=0,
                matched=False,
            )
        return InteractionResult(
            drug_a=row.drug_a_name,
            drug_b=row.drug_b_name,
            severity=row.severity,
            explanation=row.explanation,
            mechanism=row.mechanism,
            recommendations=split_values(row.recommendations),
            sources=[
                SourceInfo(
                    name=row.source_name,
                    url=row.source_url,
                    version=row.source_version,
                )
            ],
            confidence=row.confidence,
            matched=True,
        )

    def _profile_warnings(
        self,
        medicines: list[ResolvedMedicine],
        user_id: str | None,
    ) -> list[ProfileWarning]:
        if not user_id:
            return []
        profile = self.db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
        if not profile:
            return []
        return ProfileSafetyService().warnings_for_medicines(profile, medicines)

    def _duplicate_active_ingredient_warnings(
        self,
        medicines: list[ResolvedMedicine],
    ) -> list[ProfileWarning]:
        ingredient_map: dict[str, list[str]] = {}
        for medicine in medicines:
            for ingredient in split_values(medicine.composition):
                ingredient_map.setdefault(normalize_key(ingredient), []).append(medicine.resolved_name)
        warnings: list[ProfileWarning] = []
        for ingredient, names in ingredient_map.items():
            unique_names = sorted(set(names))
            if ingredient and len(unique_names) > 1:
                warnings.append(
                    ProfileWarning(
                        severity="moderate",
                        message=(
                            "Multiple selected medicines appear to share the active ingredient "
                            f"'{ingredient}', which may increase duplicate-therapy risk."
                        ),
                    )
                )
        return warnings

    def _to_resolved(self, input_value: str, medicine: Medicine) -> ResolvedMedicine:
        return ResolvedMedicine(
            input=input_value,
            resolved_name=medicine.generic_name,
            medicine_id=medicine.id,
            brand_name=medicine.brand_name,
            composition=medicine.composition,
            contraindications=medicine.contraindications,
            precautions=medicine.precautions,
            matched=True,
        )

    def _overall_severity(
        self,
        results: list[InteractionResult],
        warnings: list[ProfileWarning],
    ) -> Severity:
        severities: list[Severity] = [result.severity for result in results]
        severities.extend(warning.severity for warning in warnings)
        if not severities:
            return "unknown"
        return max(severities, key=lambda severity: SEVERITY_RANK[severity])
