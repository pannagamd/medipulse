from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit import AuditLogRead
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    action: str | None = None,
    actor_user_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> list:
    return AuditService(db).list_logs(
        action=action,
        actor_user_id=actor_user_id,
        limit=limit,
        offset=offset,
    )

