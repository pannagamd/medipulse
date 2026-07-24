from pydantic import BaseModel


class ImportBatchRead(BaseModel):
    id: str
    source_name: str
    source_type: str
    filename: str | None
    records_total: int
    records_imported: int
    errors: str | None
    status: str = "completed"

    model_config = {"from_attributes": True}


class ImportResult(BaseModel):
    batch: ImportBatchRead


class ImportBatchListResponse(BaseModel):
    total: int
    items: list[ImportBatchRead]
