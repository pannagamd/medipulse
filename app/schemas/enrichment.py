from pydantic import BaseModel

from app.schemas.medicine import MedicineRead, MedicineSourceRead


class EnrichmentResult(BaseModel):
    medicine: MedicineRead
    source: MedicineSourceRead | None = None
    updated_fields: list[str] = []
    skipped_fields: list[str] = []
    message: str

