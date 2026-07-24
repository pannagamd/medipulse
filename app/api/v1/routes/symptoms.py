from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.symptom import (
    SymptomRuleCreate,
    SymptomRuleRead,
    SymptomSuggestionRequest,
    SymptomSuggestionResponse,
)
from app.services.symptom_service import SymptomService
from app.services.audit_service import AuditService

router = APIRouter()


@router.post("/suggest", response_model=SymptomSuggestionResponse)
def suggest(
    payload: SymptomSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SymptomSuggestionResponse:
    suggestions, warnings, urgent = SymptomService(db).suggest(
        payload.symptoms,
        user_id=current_user.id,
        existing_conditions=payload.existing_conditions,
        allergies=payload.allergies,
        current_medications=payload.current_medications,
        include_saved_profile=payload.include_saved_profile,
    )
    AuditService(db).record(
        "symptoms.suggest",
        actor_user_id=current_user.id,
        details={
            "symptom_count": len(payload.symptoms),
            "suggestion_count": len(suggestions),
            "warning_count": len(warnings),
            "urgent": urgent,
        },
        commit=True,
    )
    return SymptomSuggestionResponse(suggestions=suggestions, profile_warnings=warnings, urgent=urgent)


@router.get("/rules", response_model=list[SymptomRuleRead])
def list_rules(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> list:
    return SymptomService(db).list_rules()


@router.post("/rules", response_model=SymptomRuleRead, status_code=201)
def create_rule(
    payload: SymptomRuleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> SymptomRuleRead:
    rule = SymptomService(db).create_rule(payload)
    AuditService(db).record(
        "admin.symptom_rule_created",
        actor_user_id=_.id,
        entity_type="symptom_rule",
        entity_id=rule.id,
        details={"name": rule.name},
        commit=True,
    )
    return rule
