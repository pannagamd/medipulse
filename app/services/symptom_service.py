from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_profile import HealthProfile
from app.models.symptom import SymptomRule
from app.schemas.interaction import ProfileWarning
from app.schemas.symptom import SymptomRuleCreate, SymptomSuggestion
from app.services.text import normalize_key, split_values

DEFAULT_ESCALATION_TERMS = {
    "chest pain",
    "breathing difficulty",
    "shortness of breath",
    "unconscious",
    "seizure",
    "severe allergic reaction",
    "face swelling",
    "suicidal",
    "stroke",
}


class SymptomService:
    def __init__(self, db: Session):
        self.db = db

    def suggest(
        self,
        symptoms: list[str],
        user_id: str | None = None,
        existing_conditions: str | None = None,
        allergies: str | None = None,
        current_medications: str | None = None,
        include_saved_profile: bool = True,
    ) -> tuple[list[SymptomSuggestion], list[ProfileWarning], bool]:
        symptom_keys = [normalize_key(symptom) for symptom in symptoms]
        suggestions: list[SymptomSuggestion] = []
        for rule in self.db.scalars(select(SymptomRule).order_by(SymptomRule.name)).all():
            keywords = [normalize_key(keyword) for keyword in split_values(rule.symptom_keywords)]
            matched = [
                original
                for original, symptom_key in zip(symptoms, symptom_keys, strict=False)
                if any(keyword and keyword in symptom_key for keyword in keywords)
            ]
            if not matched:
                continue
            trigger_matches = self._matched_escalation_triggers(symptom_keys, rule)
            suggestions.append(
                SymptomSuggestion(
                    rule_id=rule.id,
                    possible_condition=rule.possible_condition,
                    matched_symptoms=matched,
                    care_recommendations=split_values(rule.care_recommendations),
                    commonly_used_medicines=split_values(rule.common_medicines),
                    precautions=split_values(rule.precautions),
                    escalation_triggers=trigger_matches,
                    seek_medical_care=rule.is_emergency or bool(trigger_matches),
                    confidence=self._confidence(len(matched), len(symptoms), len(keywords)),
                )
            )
        if not suggestions:
            suggestions.append(
                SymptomSuggestion(
                    possible_condition="Undetermined",
                    matched_symptoms=symptoms,
                    care_recommendations=[
                        "Monitor symptoms and rest as appropriate.",
                        "Consult a qualified clinician if symptoms persist, worsen, or feel unusual.",
                    ],
                    precautions=["Avoid self-medicating when allergies, chronic conditions, or current medicines are involved."],
                    seek_medical_care=False,
                    confidence=0,
                )
            )
        profile_warnings = self._profile_context_warnings(
            user_id=user_id,
            include_saved_profile=include_saved_profile,
            existing_conditions=existing_conditions,
            allergies=allergies,
            current_medications=current_medications,
            suggestions=suggestions,
        )
        urgent = any(suggestion.seek_medical_care for suggestion in suggestions) or self._has_default_escalation(symptom_keys)
        return suggestions, profile_warnings, urgent

    def create_rule(self, payload: SymptomRuleCreate) -> SymptomRule:
        rule = SymptomRule(**payload.model_dump())
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def list_rules(self) -> list[SymptomRule]:
        return list(self.db.scalars(select(SymptomRule).order_by(SymptomRule.name)).all())

    def _matched_escalation_triggers(self, symptom_keys: list[str], rule: SymptomRule) -> list[str]:
        triggers = [normalize_key(trigger) for trigger in split_values(rule.escalation_triggers)]
        return [trigger for trigger in triggers if any(trigger and trigger in symptom for symptom in symptom_keys)]

    def _confidence(self, matched_count: int, symptom_count: int, keyword_count: int) -> float:
        if symptom_count == 0 or keyword_count == 0:
            return 0
        symptom_ratio = matched_count / symptom_count
        keyword_ratio = min(matched_count / keyword_count, 1)
        return round(max(0.1, min((symptom_ratio + keyword_ratio) / 2, 1)), 2)

    def _has_default_escalation(self, symptom_keys: list[str]) -> bool:
        return any(trigger in symptom for trigger in DEFAULT_ESCALATION_TERMS for symptom in symptom_keys)

    def _profile_context_warnings(
        self,
        user_id: str | None,
        include_saved_profile: bool,
        existing_conditions: str | None,
        allergies: str | None,
        current_medications: str | None,
        suggestions: list[SymptomSuggestion],
    ) -> list[ProfileWarning]:
        saved_profile = None
        if user_id and include_saved_profile:
            saved_profile = self.db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))

        conditions = split_values(existing_conditions)
        allergy_values = split_values(allergies)
        current = split_values(current_medications)
        if saved_profile:
            conditions.extend(split_values(saved_profile.medical_conditions))
            allergy_values.extend(split_values(saved_profile.allergies))
            current.extend(split_values(saved_profile.current_medications))

        warning_context = [normalize_key(value) for value in conditions + allergy_values + current]
        warnings: list[ProfileWarning] = []
        suggested_medicines = [
            medicine
            for suggestion in suggestions
            for medicine in suggestion.commonly_used_medicines
        ]
        for medicine in suggested_medicines:
            medicine_key = normalize_key(medicine)
            if any(context and context in medicine_key for context in warning_context):
                warnings.append(
                    ProfileWarning(
                        severity="moderate",
                        medicine=medicine,
                        message=(
                            "A commonly used medicine in the symptom suggestion may overlap with "
                            "the user's profile context. Review before use."
                        ),
                    )
                )
        if allergy_values and suggested_medicines:
            warnings.append(
                ProfileWarning(
                    severity="moderate",
                    message="Allergies are present in the profile/context; avoid self-medicating without review.",
                )
            )
        return warnings
