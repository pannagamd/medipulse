from app.models.health_profile import HealthProfile
from app.schemas.interaction import ProfileWarning, ResolvedMedicine
from app.services.text import normalize_key, split_values


PREGNANCY_TERMS = {"pregnancy", "pregnant"}


class ProfileSafetyService:
    def warnings_for_medicines(
        self,
        profile: HealthProfile,
        medicines: list[ResolvedMedicine],
    ) -> list[ProfileWarning]:
        warnings: list[ProfileWarning] = []
        allergies = [normalize_key(value) for value in split_values(profile.allergies)]
        conditions = [normalize_key(value) for value in split_values(profile.medical_conditions)]
        current = [normalize_key(value) for value in split_values(profile.current_medications)]

        for medicine in medicines:
            searchable_terms = self._medicine_terms(medicine)
            warnings.extend(self._allergy_warnings(medicine, allergies, searchable_terms))
            warnings.extend(self._current_medication_warnings(medicine, current, searchable_terms))
            warnings.extend(self._condition_warnings(medicine, conditions))
            warnings.extend(self._pregnancy_warnings(medicine, profile))

        return warnings

    def _medicine_terms(self, medicine: ResolvedMedicine) -> set[str]:
        values = [
            medicine.resolved_name,
            medicine.brand_name,
            medicine.composition,
        ]
        terms = {normalize_key(value) for value in values if value}
        for ingredient in split_values(medicine.composition):
            terms.add(normalize_key(ingredient))
        return {term for term in terms if term}

    def _allergy_warnings(
        self,
        medicine: ResolvedMedicine,
        allergies: list[str],
        searchable_terms: set[str],
    ) -> list[ProfileWarning]:
        warnings: list[ProfileWarning] = []
        for allergy in allergies:
            if self._matches_any(allergy, searchable_terms):
                warnings.append(
                    ProfileWarning(
                        severity="dangerous",
                        medicine=medicine.resolved_name,
                        message=(
                            f"Profile allergy '{allergy}' may match this medicine name, brand, "
                            "or composition."
                        ),
                    )
                )
        return warnings

    def _current_medication_warnings(
        self,
        medicine: ResolvedMedicine,
        current: list[str],
        searchable_terms: set[str],
    ) -> list[ProfileWarning]:
        warnings: list[ProfileWarning] = []
        for current_medication in current:
            if self._matches_any(current_medication, searchable_terms):
                warnings.append(
                    ProfileWarning(
                        severity="moderate",
                        medicine=medicine.resolved_name,
                        message=(
                            f"'{current_medication}' is already listed in current medications; "
                            "check for duplicate therapy."
                        ),
                    )
                )
        return warnings

    def _condition_warnings(
        self,
        medicine: ResolvedMedicine,
        conditions: list[str],
    ) -> list[ProfileWarning]:
        warnings: list[ProfileWarning] = []
        contraindications = normalize_key(medicine.contraindications)
        precautions = normalize_key(medicine.precautions)
        for condition in conditions:
            if condition and condition in contraindications:
                warnings.append(
                    ProfileWarning(
                        severity="dangerous",
                        medicine=medicine.resolved_name,
                        message=f"Profile condition '{condition}' appears in this medicine's contraindications.",
                    )
                )
            elif condition and condition in precautions:
                warnings.append(
                    ProfileWarning(
                        severity="moderate",
                        medicine=medicine.resolved_name,
                        message=f"Profile condition '{condition}' appears in this medicine's precautions.",
                    )
                )
        return warnings

    def _pregnancy_warnings(
        self,
        medicine: ResolvedMedicine,
        profile: HealthProfile,
    ) -> list[ProfileWarning]:
        warnings: list[ProfileWarning] = []
        if profile.is_pregnant:
            contraindications = normalize_key(medicine.contraindications)
            precautions = normalize_key(medicine.precautions)
            if any(term in contraindications for term in PREGNANCY_TERMS):
                warnings.append(
                    ProfileWarning(
                        severity="dangerous",
                        medicine=medicine.resolved_name,
                        message="Pregnancy is noted in the profile and appears in contraindications.",
                    )
                )
            elif any(term in precautions for term in PREGNANCY_TERMS):
                warnings.append(
                    ProfileWarning(
                        severity="moderate",
                        medicine=medicine.resolved_name,
                        message="Pregnancy is noted in the profile and appears in precautions.",
                    )
                )
            else:
                warnings.append(
                    ProfileWarning(
                        severity="moderate",
                        medicine=medicine.resolved_name,
                        message="Pregnancy is noted in the profile; medicine safety should be reviewed by a clinician.",
                    )
                )
        return warnings

    def _status_warning(
        self,
        medicine: ResolvedMedicine,
        status_name: str,
        terms: set[str],
        contraindications: str,
        precautions: str,
    ) -> ProfileWarning:
        if any(term in contraindications for term in terms):
            return ProfileWarning(
                severity="dangerous",
                medicine=medicine.resolved_name,
                message=f"{status_name} is noted in the profile and appears in contraindications.",
            )
        if any(term in precautions for term in terms):
            return ProfileWarning(
                severity="moderate",
                medicine=medicine.resolved_name,
                message=f"{status_name} is noted in the profile and appears in precautions.",
            )
        return ProfileWarning(
            severity="moderate",
            medicine=medicine.resolved_name,
            message=f"{status_name} is noted in the profile; medicine safety should be reviewed by a clinician.",
        )

    def _matches_any(self, needle: str, haystack: set[str]) -> bool:
        if not needle:
            return False
        return any(needle == term or needle in term for term in haystack)
