from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.health_profile import HealthProfile
from app.models.user import User
from app.schemas.profile import HealthProfileRead, HealthProfileUpdate, ProfileSafetyCheckRequest, ProfileSafetyCheckResponse
from app.services.audit_service import AuditService
from app.services.interaction_service import InteractionService

router = APIRouter()


@router.get("", response_model=HealthProfileRead | None)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthProfile | None:
    return db.scalar(select(HealthProfile).where(HealthProfile.user_id == current_user.id))


@router.put("", response_model=HealthProfileRead)
def upsert_profile(
    payload: HealthProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthProfile:
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == current_user.id))
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.flush()
    AuditService(db).record(
        "profile.upsert",
        actor_user_id=current_user.id,
        entity_type="health_profile",
        entity_id=profile.id,
        details={"updated_fields": list(payload.model_dump(exclude_unset=True).keys())},
    )
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/safety-check", response_model=ProfileSafetyCheckResponse)
def profile_safety_check(
    payload: ProfileSafetyCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileSafetyCheckResponse:
    _, resolved, warnings, _ = InteractionService(db).analyze(payload.medicines, user_id=current_user.id)
    AuditService(db).record(
        "profile.safety_check",
        actor_user_id=current_user.id,
        entity_type="health_profile",
        details={"medicine_count": len(payload.medicines), "warning_count": len(warnings)},
        commit=True,
    )
    return ProfileSafetyCheckResponse(resolved_medicines=resolved, profile_warnings=warnings)
