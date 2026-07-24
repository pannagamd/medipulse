from pydantic import BaseModel

from app.core.constants import MEDICAL_DISCLAIMER


class MessageResponse(BaseModel):
    message: str


class SourceInfo(BaseModel):
    name: str
    url: str | None = None
    version: str | None = None
    date: str | None = None


class SafetyResponseBase(BaseModel):
    medical_disclaimer: str = MEDICAL_DISCLAIMER

