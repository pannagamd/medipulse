from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.enrichment import EnrichmentResult
from app.services.audit_service import AuditService
from app.services.enrichment_service import EnrichmentService

router = APIRouter()


@router.post("/medicines/{medicine_id}/rxnorm", response_model=EnrichmentResult)
async def enrich_medicine_rxnorm(
    medicine_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> EnrichmentResult:
    result = await EnrichmentService(db).enrich_rxnorm(medicine_id)
    AuditService(db).record(
        "admin.enrich_rxnorm",
        actor_user_id=current_user.id,
        entity_type="medicine",
        entity_id=medicine_id,
        details={"updated_fields": result.updated_fields, "message": result.message},
        commit=True,
    )
    return result


@router.post("/medicines/{medicine_id}/openfda-label", response_model=EnrichmentResult)
async def enrich_medicine_openfda_label(
    medicine_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> EnrichmentResult:
    result = await EnrichmentService(db).enrich_openfda_label(medicine_id)
    AuditService(db).record(
        "admin.enrich_openfda_label",
        actor_user_id=current_user.id,
        entity_type="medicine",
        entity_id=medicine_id,
        details={
            "updated_fields": result.updated_fields,
            "skipped_fields": result.skipped_fields,
            "message": result.message,
        },
        commit=True,
    )
    return result
