"""
Diagnostics endpoints — admin-only, for verifying production DB state.

GET /api/v1/diagnostics/db     — Table row counts
GET /api/v1/diagnostics/config — Sanitised runtime configuration
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.health_profile import HealthProfile
from app.models.interaction import DrugInteraction
from app.models.medicine import Medicine, MedicineAlias
from app.models.symptom import SymptomRule
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow only admin users to access diagnostics endpoints."""
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("/db", summary="Database table counts (admin only)")
def db_diagnostics(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
) -> dict:
    """
    Returns row counts for all key tables.
    Use this right after deployment to confirm seeding succeeded.
    """
    try:
        counts = {
            "medicines": db.scalar(select(func.count()).select_from(Medicine)) or 0,
            "medicine_aliases": db.scalar(select(func.count()).select_from(MedicineAlias)) or 0,
            "drug_interactions": db.scalar(select(func.count()).select_from(DrugInteraction)) or 0,
            "symptom_rules": db.scalar(select(func.count()).select_from(SymptomRule)) or 0,
            "users": db.scalar(select(func.count()).select_from(User)) or 0,
            "health_profiles": db.scalar(select(func.count()).select_from(HealthProfile)) or 0,
        }
        status_flag = counts["medicines"] > 3
        logger.info("DB diagnostics requested: %s", counts)
        return {
            "status": "ok" if status_flag else "warning",
            "warning": None if status_flag else "Medicine table has 3 rows or fewer — seeding may have failed",
            "counts": counts,
        }
    except Exception as exc:
        logger.exception("DB diagnostics query failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB query failed: {exc}",
        ) from exc


@router.get("/config", summary="Sanitised runtime config (admin only)")
def config_diagnostics(
    _: User = Depends(_require_admin),
) -> dict:
    """
    Returns sanitised runtime configuration — secrets are masked.
    Useful for confirming environment variables are being picked up in production.
    """
    return {
        "environment": settings.environment,
        "app_name": settings.app_name,
        "database_url": _mask_dsn(settings.database_url),
        "cors_origins": settings.cors_origins,
        "firebase_project_id": settings.firebase_project_id,
        "firebase_use_emulator": settings.firebase_use_emulator,
        "firebase_auth_emulator_host": settings.firebase_auth_emulator_host,
        "secret_key_set": settings.secret_key != "change-me-in-production",
        "rate_limit_enabled": settings.rate_limit_enabled,
    }


def _mask_dsn(url: str) -> str:
    """Hide the password portion of a DSN string."""
    try:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(url)
        if parsed.password:
            masked = parsed._replace(
                netloc="{}:***@{}{}".format(
                    parsed.username,
                    parsed.hostname,
                    f":{parsed.port}" if parsed.port else "",
                )
            )
            return urlunparse(masked)
    except Exception:
        pass
    return url
