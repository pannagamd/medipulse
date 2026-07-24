from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import SourceInfo


class MedicineAliasRead(BaseModel):
    id: str
    alias: str
    alias_type: str
    source_name: str

    model_config = {"from_attributes": True}


class MedicineSourceRead(BaseModel):
    id: str
    source_name: str
    source_record_id: str | None = None
    source_url: str | None = None
    source_version: str | None = None
    source_date: str | None = None
    confidence: float

    model_config = {"from_attributes": True}


class MedicineBase(BaseModel):
    generic_name: str = Field(min_length=1, max_length=255)
    brand_name: str | None = Field(default=None, max_length=255)
    composition: str | None = None
    dosage_form: str | None = None
    strength: str | None = None
    side_effects: str | None = None
    precautions: str | None = None
    contraindications: str | None = None
    storage_instructions: str | None = None
    usage_guidelines: str | None = None
    source_name: str = "local"
    source_url: str | None = None
    source_version: str | None = None
    source_date: str | None = None
    confidence: float = Field(default=1.0, ge=0, le=1)
    rx_cui: str | None = None


class MedicineCreate(MedicineBase):
    aliases: list[str] = []


class MedicineRead(MedicineBase):
    id: str
    created_at: datetime
    updated_at: datetime
    aliases: list[MedicineAliasRead] = []
    sources: list[MedicineSourceRead] = []

    model_config = {"from_attributes": True}


class MedicineSearchResponse(BaseModel):
    total: int
    items: list[MedicineRead]


class MedicineSummary(BaseModel):
    id: str
    generic_name: str
    brand_name: str | None = None
    composition: str | None = None
    source: SourceInfo
