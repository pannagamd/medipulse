from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import MEDICAL_DISCLAIMER, SourceInfo

Severity = Literal["safe", "moderate", "high", "dangerous", "unknown"]


class InteractionAnalyzeRequest(BaseModel):
    medicines: list[str] = Field(min_length=2, max_length=20)
    include_profile_context: bool = True


class InteractionResult(BaseModel):
    drug_a: str
    drug_b: str
    severity: Severity
    explanation: str
    mechanism: str | None = None
    recommendations: list[str] = Field(default_factory=list)
    sources: list[SourceInfo] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    matched: bool = False


class ProfileWarning(BaseModel):
    severity: Severity
    message: str
    medicine: str | None = None


class ResolvedMedicine(BaseModel):
    input: str
    resolved_name: str
    medicine_id: str | None = None
    brand_name: str | None = None
    composition: str | None = None
    contraindications: str | None = None
    precautions: str | None = None
    matched: bool = False


class InteractionAnalyzeResponse(BaseModel):
    results: list[InteractionResult]
    resolved_medicines: list[ResolvedMedicine] = Field(default_factory=list)
    profile_warnings: list[ProfileWarning] = Field(default_factory=list)
    overall_severity: Severity
    medical_disclaimer: str = MEDICAL_DISCLAIMER
