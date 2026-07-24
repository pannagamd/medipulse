import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import InMemoryRateLimitMiddleware
from app.db.session import SessionLocal
from app.models.health_profile import HealthProfile
from app.models.interaction import DrugInteraction
from app.models.medicine import Medicine
from app.models.user import User

logger = logging.getLogger(__name__)

# Minimum expected counts — CRITICAL warning is emitted if below these thresholds.
# These numbers reflect a fully seeded production database.
MIN_MEDICINES = 100
MIN_INTERACTIONS = 50


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Informational medicine safety API. Not a substitute for medical advice.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(InMemoryRateLimitMiddleware)

    @app.middleware("http")
    async def log_requests(request, call_next):
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled exception for %s %s", request.method, request.url.path)
            raise

        elapsed_ms = (time.perf_counter() - start) * 1000
        if request.url.path.startswith("/api/") or request.url.path == "/health":
            logger.info(
                "%s %s -> %s in %.1fms",
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
        return response

    @app.get("/health", tags=["health"])
    def health_check() -> dict:
        """
        Health check endpoint.
        Returns DB row counts so monitoring tools can detect empty-DB deployments.
        This endpoint does NOT require authentication.
        """
        counts: dict = {}
        db_status = "ok"
        warnings: list[str] = []
        try:
            with SessionLocal() as db:
                counts["medicines"] = db.scalar(select(func.count()).select_from(Medicine)) or 0
                counts["interactions"] = db.scalar(select(func.count()).select_from(DrugInteraction)) or 0
                counts["users"] = db.scalar(select(func.count()).select_from(User)) or 0
            if counts["medicines"] < MIN_MEDICINES:
                db_status = "degraded"
                warnings.append(
                    f"Medicine count ({counts['medicines']}) is below minimum ({MIN_MEDICINES}). "
                    "Run: python scripts/seed_data.py"
                )
            if counts["interactions"] < MIN_INTERACTIONS:
                db_status = "degraded"
                warnings.append(
                    f"Interaction count ({counts['interactions']}) is below minimum ({MIN_INTERACTIONS}). "
                    "Run: python scripts/seed_interactions.py"
                )
        except Exception as exc:
            db_status = "error"
            warnings.append(f"DB query failed: {exc}")

        return {
            "status": "ok" if db_status == "ok" else db_status,
            "environment": settings.environment,
            "db": db_status,
            "counts": counts,
            "warnings": warnings,
        }

    @app.on_event("startup")
    def startup_db_diagnostics() -> None:
        """
        Runs at server startup. Logs DB row counts and emits CRITICAL warnings
        if the medicine or interaction tables are below minimum thresholds.
        These warnings are visible in Render / Docker container logs.
        """
        try:
            with SessionLocal() as db:
                user_total        = db.scalar(select(func.count()).select_from(User)) or 0
                profile_total     = db.scalar(select(func.count()).select_from(HealthProfile)) or 0
                medicine_total    = db.scalar(select(func.count()).select_from(Medicine)) or 0
                interaction_total = db.scalar(select(func.count()).select_from(DrugInteraction)) or 0

            logger.info(
                "Startup DB diagnostics: users=%d profiles=%d medicines=%d interactions=%d",
                user_total, profile_total, medicine_total, interaction_total,
            )

            # --- medicine check ---
            if medicine_total == 0:
                logger.critical(
                    "STARTUP CRITICAL: Medicine table is EMPTY. "
                    "Seeding has not run or failed. "
                    "Run: python scripts/seed_data.py"
                )
            elif medicine_total < MIN_MEDICINES:
                logger.warning(
                    "STARTUP WARNING: Medicine count (%d) is below minimum threshold (%d). "
                    "Re-run: python scripts/seed_data.py --force",
                    medicine_total, MIN_MEDICINES,
                )
            else:
                logger.info("Medicine table OK: %d records.", medicine_total)

            # --- interaction check ---
            if interaction_total == 0:
                logger.critical(
                    "STARTUP CRITICAL: Drug interaction table is EMPTY. "
                    "Seeding has not run or failed. "
                    "Run: python scripts/seed_interactions.py"
                )
            elif interaction_total < MIN_INTERACTIONS:
                logger.warning(
                    "STARTUP WARNING: Interaction count (%d) is below minimum threshold (%d). "
                    "Re-run: python scripts/seed_interactions.py --force",
                    interaction_total, MIN_INTERACTIONS,
                )
            else:
                logger.info("Interaction table OK: %d records.", interaction_total)

        except Exception:
            logger.exception("Startup DB diagnostics failed — DB may be unreachable")

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
