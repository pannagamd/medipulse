from fastapi import APIRouter

from app.api.v1.routes import admin_audit, admin_enrichment, admin_imports, auth, diagnostics, interactions, medicines, profile, symptoms

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(medicines.router, prefix="/medicines", tags=["medicines"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["interactions"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(symptoms.router, prefix="/symptoms", tags=["symptoms"])
api_router.include_router(admin_imports.router, prefix="/admin/imports", tags=["admin-imports"])
api_router.include_router(admin_enrichment.router, prefix="/admin/enrichment", tags=["admin-enrichment"])
api_router.include_router(admin_audit.router, prefix="/admin/audit", tags=["admin-audit"])
api_router.include_router(diagnostics.router, prefix="/diagnostics", tags=["diagnostics"])
