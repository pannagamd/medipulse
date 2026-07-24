from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.core.config import settings
from app.main import app
from app.models.medicine import ImportBatch
from app.models.user import User
from app.services.audit_service import AuditService


def test_admin_can_list_audit_logs(client: TestClient, db: Session, admin: User) -> None:
    app.dependency_overrides[get_admin_user] = lambda: admin
    AuditService(db).record(
        "test.action",
        actor_user_id=admin.id,
        entity_type="test",
        entity_id="entity-1",
        details={"ok": True},
        commit=True,
    )

    response = client.get("/api/v1/admin/audit", params={"action": "test.action"})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["action"] == "test.action"
    assert body[0]["actor_user_id"] == admin.id


def test_admin_can_list_import_batches(client: TestClient, db: Session, admin: User) -> None:
    app.dependency_overrides[get_admin_user] = lambda: admin
    db.add(
        ImportBatch(
            source_name="local",
            source_type="medicine_dataset",
            filename="medicines.csv",
            records_total=2,
            records_imported=2,
            created_by_user_id=admin.id,
        )
    )
    db.commit()

    response = client.get("/api/v1/admin/imports/batches")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["filename"] == "medicines.csv"


def test_rate_limit_can_block_requests(client: TestClient) -> None:
    original_enabled = settings.rate_limit_enabled
    original_requests = settings.rate_limit_requests
    settings.rate_limit_enabled = True
    settings.rate_limit_requests = 0
    try:
        response = client.get("/api/v1/medicines/search", params={"q": "para"})
    finally:
        settings.rate_limit_enabled = original_enabled
        settings.rate_limit_requests = original_requests

    assert response.status_code == 429
