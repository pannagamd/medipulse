from pydantic import BaseModel, Field

from app.core.constants import MEDICAL_DISCLAIMER
from app.schemas.interaction import ProfileWarning, ResolvedMedicine


class HealthProfileUpdate(BaseModel):
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = Field(default=None, max_length=50)
    weight_kg: float | None = Field(default=None, ge=0, le=500)
    allergies: str | None = None
    medical_conditions: str | None = None
    current_medications: str | None = None
    is_pregnant: bool | None = None
    notes: str | None = None


class HealthProfileRead(HealthProfileUpdate):
    id: str
    user_id: str

    model_config = {"from_attributes": True}


class ProfileSafetyCheckRequest(BaseModel):
    medicines: list[str] = Field(min_length=1, max_length=20)


class ProfileSafetyCheckResponse(BaseModel):
    resolved_medicines: list[ResolvedMedicine]
    profile_warnings: list[ProfileWarning]
    medical_disclaimer: str = MEDICAL_DISCLAIMER
