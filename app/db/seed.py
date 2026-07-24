import csv
import logging
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.interaction import DrugInteraction
from app.models.medicine import Medicine, MedicineAlias, MedicineSource
from app.models.symptom import SymptomRule
from app.models.user import User
from app.services.text import normalize_key, split_values

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MEDICINES_SAMPLE_FILE = PROJECT_ROOT / "data" / "examples" / "medicines_sample.csv"
DDINTER_SAMPLE_FILE = PROJECT_ROOT / "data" / "examples" / "ddinter_sample.csv"

DEFAULT_SYMPTOM_RULES = [
    {
        "name": "Common Cold",
        "symptom_keywords": "cough;runny nose;sneezing;sore throat",
        "possible_condition": "Common cold or upper respiratory infection",
        "care_recommendations": "Rest;Drink fluids;Use steam inhalation if comfortable",
        "common_medicines": "Paracetamol",
        "precautions": "Avoid antibiotics unless prescribed;Seek care if symptoms worsen",
        "escalation_triggers": "breathing difficulty;chest pain;high fever",
        "is_emergency": False,
    },
    {
        "name": "Fever",
        "symptom_keywords": "fever;chills;body ache",
        "possible_condition": "Fever from infection or inflammation",
        "care_recommendations": "Hydrate;Rest;Monitor temperature",
        "common_medicines": "Paracetamol",
        "precautions": "Avoid overdose;Consult a clinician for persistent or very high fever",
        "escalation_triggers": "very high fever;confusion;seizure;breathing difficulty",
        "is_emergency": False,
    },
    {
        "name": "Emergency Chest Pain",
        "symptom_keywords": "chest pain;pressure in chest;shortness of breath",
        "possible_condition": "Possible cardiac or respiratory emergency",
        "care_recommendations": "Seek urgent medical care immediately",
        "common_medicines": None,
        "precautions": "Do not delay emergency evaluation",
        "escalation_triggers": "chest pain;shortness of breath;fainting",
        "is_emergency": True,
    },
]


def seed_admin(db: Session) -> User:
    """
    Ensure exactly one admin user exists with the credentials from settings.

    - If the admin exists at the configured phone: sync email, name + password
      always (so .env credential changes apply on the next seed run).
    - If not: create it.
    - In both cases: demote any other admin accounts (stale/ghost records).
    """
    target_phone = settings.seed_admin_phone
    target_email = settings.seed_admin_email

    # ── Upsert the canonical admin ────────────────────────────────────────────
    user = db.scalar(select(User).where(User.phone_number == target_phone))
    if user:
        user.is_admin = True
        user.full_name = settings.seed_admin_full_name
        user.email = target_email
        # Always re-hash: a credential change in .env is applied automatically.
        user.hashed_password = hash_password(settings.seed_admin_password)
        logger.info("seed_admin: synced existing admin phone=%s email=%s", target_phone, target_email)
    else:
        # If another non-admin user already claims the target email, clear it
        # so the unique constraint doesn't block admin creation.
        email_conflict = db.scalar(
            select(User).where(User.email == target_email, User.phone_number != target_phone)
        )
        if email_conflict:
            logger.warning(
                "seed_admin: clearing email conflict on phone=%s", email_conflict.phone_number
            )
            email_conflict.email = None

        user = User(
            phone_number=target_phone,
            email=target_email,
            full_name=settings.seed_admin_full_name,
            is_admin=True,
            hashed_password=hash_password(settings.seed_admin_password),
        )
        db.add(user)
        logger.info("seed_admin: created new admin phone=%s email=%s", target_phone, target_email)

    # ── Always demote any other admins (stale from previous seed runs) ────────
    stale_admins = db.scalars(
        select(User).where(User.is_admin == True, User.phone_number != target_phone)  # noqa: E712
    ).all()
    for stale in stale_admins:
        stale.is_admin = False
        logger.warning(
            "seed_admin: demoted stale admin phone=%s name=%s",
            stale.phone_number,
            stale.full_name,
        )

    return user


def seed_symptom_rules(db: Session) -> int:
    created = 0
    for rule_data in DEFAULT_SYMPTOM_RULES:
        existing = db.scalar(select(SymptomRule).where(SymptomRule.name == rule_data["name"]))
        if existing:
            continue
        db.add(SymptomRule(**rule_data))
        created += 1
    return created


def _clean(value: object | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text and text.lower() not in {"none", "n/a", "na", "-"} else None


def _read_csv_rows(file_path: Path) -> list[dict[str, str]]:
    with file_path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def seed_medicine_catalog(db: Session) -> dict[str, int]:
    created = 0
    updated = 0

    if not MEDICINES_SAMPLE_FILE.exists():
        logger.warning("Medicine seed file missing: %s", MEDICINES_SAMPLE_FILE)
        return {"created": 0, "updated": 0}

    rows = _read_csv_rows(MEDICINES_SAMPLE_FILE)
    for row in rows:
        generic_name = _clean(row.get("generic_name"))
        if not generic_name:
            continue

        existing = db.scalar(
            select(Medicine).where(func.lower(Medicine.generic_name) == generic_name.casefold())
        )
        alias_values = [alias for alias in split_values(row.get("aliases")) if alias]
        brand_name = _clean(row.get("brand_name"))

        if existing:
            changed = False
            for field in (
                "brand_name",
                "composition",
                "dosage_form",
                "strength",
                "side_effects",
                "precautions",
                "contraindications",
                "storage_instructions",
                "usage_guidelines",
                "source_name",
                "source_url",
                "source_version",
                "source_date",
                "rx_cui",
            ):
                value = _clean(row.get(field))
                if value and not getattr(existing, field):
                    setattr(existing, field, value)
                    changed = True
            if not existing.confidence:
                existing.confidence = 1.0
                changed = True

            existing_aliases = {normalize_key(alias.alias) for alias in existing.aliases}
            for alias in alias_values:
                alias_key = normalize_key(alias)
                if alias_key and alias_key not in existing_aliases:
                    db.add(
                        MedicineAlias(
                            id=str(uuid4()),
                            medicine_id=existing.id,
                            alias=alias,
                            alias_type="imported",
                            source_name="local-sample",
                        )
                    )
                    existing_aliases.add(alias_key)
                    changed = True

            if brand_name and normalize_key(brand_name) != normalize_key(existing.generic_name):
                brand_key = normalize_key(brand_name)
                if brand_key not in existing_aliases:
                    db.add(
                        MedicineAlias(
                            id=str(uuid4()),
                            medicine_id=existing.id,
                            alias=brand_name,
                            alias_type="brand",
                            source_name="local-sample",
                        )
                    )
                    existing_aliases.add(brand_key)
                    changed = True

            if changed:
                updated += 1
            continue

        medicine = Medicine(
            id=str(uuid4()),
            generic_name=generic_name,
            brand_name=brand_name,
            composition=_clean(row.get("composition")),
            dosage_form=_clean(row.get("dosage_form")),
            strength=_clean(row.get("strength")),
            side_effects=_clean(row.get("side_effects")),
            precautions=_clean(row.get("precautions")),
            contraindications=_clean(row.get("contraindications")),
            storage_instructions=_clean(row.get("storage_instructions")),
            usage_guidelines=_clean(row.get("usage_guidelines")),
            source_name="local-sample",
            source_url=None,
            source_version="sample",
            source_date=None,
            confidence=1.0,
        )
        db.add(medicine)
        db.flush()

        existing_aliases: set[str] = set()
        for alias in alias_values:
            alias_key = normalize_key(alias)
            if not alias_key or alias_key in existing_aliases:
                continue
            db.add(
                MedicineAlias(
                    id=str(uuid4()),
                    medicine_id=medicine.id,
                    alias=alias,
                    alias_type="imported",
                    source_name="local-sample",
                )
            )
            existing_aliases.add(alias_key)

        if brand_name and normalize_key(brand_name) != normalize_key(generic_name):
            db.add(
                MedicineAlias(
                    id=str(uuid4()),
                    medicine_id=medicine.id,
                    alias=brand_name,
                    alias_type="brand",
                    source_name="local-sample",
                )
            )

        db.add(
            MedicineSource(
                id=str(uuid4()),
                medicine_id=medicine.id,
                source_name="local-sample",
                source_record_id=generic_name,
                source_url=None,
                source_version="sample",
                source_date=None,
                confidence=1.0,
                payload_json=None,
            )
        )
        created += 1

    return {"created": created, "updated": updated}


def seed_ddinter_interactions(db: Session) -> dict[str, int]:
    created = 0
    updated = 0

    if not DDINTER_SAMPLE_FILE.exists():
        logger.warning("DDInter seed file missing: %s", DDINTER_SAMPLE_FILE)
        return {"created": 0, "updated": 0}

    for row in _read_csv_rows(DDINTER_SAMPLE_FILE):
        drug_a = _clean(row.get("drug_a"))
        drug_b = _clean(row.get("drug_b"))
        if not drug_a or not drug_b:
            continue

        key_a = normalize_key(drug_a)
        key_b = normalize_key(drug_b)
        if key_a > key_b:
            key_a, key_b = key_b, key_a
            drug_a, drug_b = drug_b, drug_a

        severity = _clean(row.get("severity")) or "unknown"
        update_fields = {
            "drug_a_name": drug_a,
            "drug_b_name": drug_b,
            "severity": severity,
            "explanation": _clean(row.get("explanation")) or "Interaction noted.",
            "mechanism": _clean(row.get("mechanism")),
            "recommendations": _clean(row.get("recommendations")),
            "source_name": _clean(row.get("source_name")) or "DDInter sample",
            "source_url": _clean(row.get("source_url")),
            "source_version": _clean(row.get("source_version")),
            "confidence": 0.8,
        }

        existing = db.scalar(
            select(DrugInteraction).where(
                DrugInteraction.drug_a_key == key_a,
                DrugInteraction.drug_b_key == key_b,
            )
        )
        if existing:
            changed = False
            for field, value in update_fields.items():
                if value is not None and getattr(existing, field) in {None, ""}:
                    setattr(existing, field, value)
                    changed = True
            if changed:
                updated += 1
            continue

        db.add(
            DrugInteraction(
                id=str(uuid4()),
                drug_a_key=key_a,
                drug_b_key=key_b,
                **update_fields,
            )
        )
        created += 1

    return {"created": created, "updated": updated}


def seed_local_dataset(db: Session) -> dict[str, dict[str, int]]:
    medicine_result = seed_medicine_catalog(db)
    interaction_result = seed_ddinter_interactions(db)
    return {
        "medicines": medicine_result,
        "interactions": interaction_result,
    }


def run_seed() -> None:
    with SessionLocal() as db:
        seed_admin(db)
        created_rules = seed_symptom_rules(db)
        dataset_result = seed_local_dataset(db)
        db.commit()
        medicine_total = db.scalar(select(func.count()).select_from(Medicine)) or 0
        interaction_total = db.scalar(select(func.count()).select_from(DrugInteraction)) or 0
        print(
            "Seed complete: admin_phone='{}', symptom_rules_created={}, medicines_created={}, medicines_updated={}, interactions_created={}, interactions_updated={}, medicine_total={}, interaction_total={}".format(
                settings.seed_admin_phone,
                created_rules,
                dataset_result["medicines"]["created"],
                dataset_result["medicines"]["updated"],
                dataset_result["interactions"]["created"],
                dataset_result["interactions"]["updated"],
                medicine_total,
                interaction_total,
            )
        )


if __name__ == "__main__":
    run_seed()
