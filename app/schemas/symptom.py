from pydantic import BaseModel, Field

from app.core.constants import EMERGENCY_WARNING, MEDICAL_DISCLAIMER
from app.schemas.interaction import ProfileWarning


class SymptomSuggestionRequest(BaseModel):
    symptoms: list[str] = Field(min_length=1, max_length=20)
    existing_conditions: str | None = None
    allergies: str | None = None
    current_medications: str | None = None
    include_saved_profile: bool = True


class SymptomSuggestion(BaseModel):
    rule_id: str | None = None
    possible_condition: str
    matched_symptoms: list[str]
    care_recommendations: list[str]
    commonly_used_medicines: list[str] = []
    precautions: list[str] = []
    escalation_triggers: list[str] = []
    seek_medical_care: bool = False
    confidence: float = Field(default=0, ge=0, le=1)


class SymptomSuggestionResponse(BaseModel):
    suggestions: list[SymptomSuggestion]
    profile_warnings: list[ProfileWarning] = Field(default_factory=list)
    urgent: bool = False
    emergency_warning: str = EMERGENCY_WARNING
    medical_disclaimer: str = MEDICAL_DISCLAIMER


class SymptomRuleCreate(BaseModel):
    name: str
    symptom_keywords: str
    possible_condition: str
    care_recommendations: str
    common_medicines: str | None = None
    precautions: str | None = None
    escalation_triggers: str | None = None
    is_emergency: bool = False


class SymptomRuleRead(SymptomRuleCreate):
    id: str

    model_config = {"from_attributes": True}
