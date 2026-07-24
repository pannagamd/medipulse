from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.imports import ImportBatchListResponse, ImportResult
from app.services.audit_service import AuditService
from app.services.import_service import ImportService

router = APIRouter()


@router.post("/medicines", response_model=ImportResult)
async def import_medicines(
    source_name: str = Form(default="local"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> ImportResult:
    batch = await ImportService(db).import_medicines(file, source_name, current_user.id)
    AuditService(db).record(
        "admin.import_medicines",
        actor_user_id=current_user.id,
        entity_type="import_batch",
        entity_id=batch.id,
        details={
            "source_name": source_name,
            "filename": file.filename,
            "records_total": batch.records_total,
            "records_imported": batch.records_imported,
        },
        commit=True,
    )
    return ImportResult(batch=batch)


@router.post("/ddinter")
async def import_ddinter(
    source_name: str = Form(default="DDInter"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> dict[str, int]:
    result = await ImportService(db).import_ddinter(file, source_name)
    AuditService(db).record(
        "admin.import_ddinter",
        actor_user_id=current_user.id,
        entity_type="drug_interaction",
        details={"source_name": source_name, "filename": file.filename, **result},
        commit=True,
    )
    return result


@router.get("/batches", response_model=ImportBatchListResponse)
def list_import_batches(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> ImportBatchListResponse:
    total, items = ImportService(db).list_batches(limit=limit, offset=offset)
    return ImportBatchListResponse(total=total, items=items)
