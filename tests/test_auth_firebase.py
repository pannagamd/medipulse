from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


@patch("app.services.auth_service.verify_firebase_id_token")
def test_firebase_login_creates_user_and_returns_jwt(
    mock_verify,
    client: TestClient,
    db: Session,
    firebase_claims: dict,
) -> None:
    mock_verify.return_value = firebase_claims

    response = client.post(
        "/api/v1/auth/firebase",
        json={"id_token": "fake-firebase-id-token", "full_name": "Phone User"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["phone_number"] == "+15555550999"
    assert body["user"]["full_name"] == "Phone User"

    user = db.scalar(select(User).where(User.phone_number == "+15555550999"))
    assert user is not None
    assert user.firebase_uid == "firebase-new-user"


@patch("app.services.auth_service.verify_firebase_id_token")
def test_firebase_login_rejects_invalid_token(mock_verify, client: TestClient) -> None:
    mock_verify.side_effect = ValueError("Invalid or expired Firebase token")

    response = client.post("/api/v1/auth/firebase", json={"id_token": "bad-firebase-token"})

    assert response.status_code == 401


@patch("app.services.auth_service.verify_firebase_id_token")
def test_firebase_login_existing_user(mock_verify, client: TestClient, user: User) -> None:
    mock_verify.return_value = {
        "uid": user.firebase_uid,
        "phone_number": user.phone_number,
        "firebase": {"sign_in_provider": "phone"},
    }

    response = client.post("/api/v1/auth/firebase", json={"id_token": "fake-firebase-id-token"})

    assert response.status_code == 200
    assert response.json()["user"]["id"] == user.id
