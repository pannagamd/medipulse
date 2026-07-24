import json
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Smart Drug Interaction and Safety API"
    environment: str = "development"
    secret_key: str = Field(default="change-me-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/drug_safety"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        # Production: add your deployed frontend URL here or set CORS_ORIGINS env var in Render
        "https://smart-drug-safety-api.onrender.com",
    ]

    # Firebase Admin SDK (backend token verification)
    firebase_project_id: str = "demo-medisafety"
    firebase_credentials_path: str | None = None
    firebase_credentials_json: str | None = None
    firebase_use_emulator: bool = False
    firebase_auth_emulator_host: str = "127.0.0.1:9099"

    rate_limit_enabled: bool = True
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60
    max_upload_bytes: int = 50 * 1024 * 1024
    seed_admin_phone: str = "+919876543210"
    seed_admin_email: str = "admin@medipulse.in"
    seed_admin_full_name: str = "MediPulse Admin"
    seed_admin_password: str = "MediPulse@2024"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalise_database_url(cls, value: str) -> str:
        # Render supplies postgresql:// or postgres://, but psycopg v3 requires
        # the postgresql+psycopg:// scheme. Normalise here so the Render env var
        # can be pasted as-is without manual editing.
        if isinstance(value, str):
            if value.startswith("postgres://"):
                value = "postgresql+psycopg://" + value[len("postgres://"):]
            elif value.startswith("postgresql://"):
                value = "postgresql+psycopg://" + value[len("postgresql://"):]
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):  # JSON array format
                return json.loads(stripped)
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
