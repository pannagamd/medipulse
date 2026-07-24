import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.interaction import InteractionAnalyzeRequest, InteractionAnalyzeResponse
from app.services.audit_service import AuditService
from app.services.interaction_service import InteractionService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=InteractionAnalyzeResponse)
def analyze_interactions(
    payload: InteractionAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InteractionAnalyzeResponse:
    user_id = current_user.id if payload.include_profile_context else None
    results, resolved, warnings, overall = InteractionService(db).analyze(payload.medicines, user_id=user_id)

    logger.info(
        "Interaction analysis: medicines=%d resolved=%d results=%d warnings=%d severity=%r",
        len(payload.medicines),
        len(resolved),
        len(results),
        len(warnings),
        overall,
    )
    if len(resolved) < len(payload.medicines):
        logger.warning(
            "Could not resolve all medicines: requested=%d resolved=%d — DB may have insufficient data",
            len(payload.medicines),
            len(resolved),
        )

    AuditService(db).record(
        "interactions.analyze",
        actor_user_id=current_user.id,
        details={
            "medicine_count": len(payload.medicines),
            "result_count": len(results),
            "warning_count": len(warnings),
            "overall_severity": overall,
        },
        commit=True,
    )
    return InteractionAnalyzeResponse(
        results=results,
        resolved_medicines=resolved,
        profile_warnings=warnings,
        overall_severity=overall,
    )
