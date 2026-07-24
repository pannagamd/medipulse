import os
from collections.abc import Generator
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["FIREBASE_CREDENTIALS_JSON"] = '{"type":"service_account","project_id":"test","private_key_id":"x","private_key":"-----BEGIN RSA PRIVATE KEY-----\\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8Sw\\n-----END RSA PRIVATE KEY-----\\n","client_email":"test@test.iam.gserviceaccount.com","client_id":"1","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}'

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.api.deps import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def user(db: Session) -> User:
    test_user = User(
        phone_number="+15555550001",
        firebase_uid="firebase-user-1",
        full_name="Test User",
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    return test_user


@pytest.fixture()
def admin(db: Session) -> User:
    test_admin = User(
        phone_number="+919876543210",
        firebase_uid="firebase-admin-1",
        full_name="MediPulse Admin",
        is_admin=True,
    )
    db.add(test_admin)
    db.commit()
    db.refresh(test_admin)
    return test_admin


@pytest.fixture()
def client(db: Session, user: User) -> Generator[TestClient, None, None]:
    def override_db() -> Generator[Session, None, None]:
        yield db

    def override_user() -> User:
        return user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def firebase_claims() -> dict:
    return {
        "uid": "firebase-new-user",
        "phone_number": "+15555550999",
        "firebase": {"sign_in_provider": "phone"},
    }
