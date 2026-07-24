from datetime import timedelta

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_token, decode_token, hash_password, utc_now, verify_password
from app.models.user import RevokedToken, User
from app.services.audit_service import AuditService


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, phone_number: str, password: str, full_name: str) -> tuple[User, str, str]:
        existing = self.db.scalar(select(User).where(User.phone_number == phone_number))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this phone number already exists.",
            )
        user = User(
            phone_number=phone_number,
            full_name=full_name,
            hashed_password=hash_password(password),
        )
        self.db.add(user)
        self.db.flush()
        AuditService(self.db).record(
            "auth.register",
            actor_user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"phone_number": phone_number},
        )
        self.db.commit()
        self.db.refresh(user)
        access, refresh = self._token_pair(user)
        return user, access, refresh

    def login(self, username: str, password: str) -> tuple[User, str, str]:
        user = self.db.scalar(select(User).where(User.phone_number == username))
        if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")
        AuditService(self.db).record(
            "auth.login",
            actor_user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"phone_number": user.phone_number},
        )
        self.db.commit()
        access, refresh = self._token_pair(user)
        return user, access, refresh

    def refresh(self, refresh_token: str) -> tuple[str, str]:
        payload = self._decode_expected_token(refresh_token, "refresh")
        user = self.db.get(User, payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        self.revoke_token_payload(payload)
        return self._token_pair(user)

    def revoke_token(self, token: str) -> None:
        try:
            payload = decode_token(token)
        except jwt.PyJWTError:
            return
        self.revoke_token_payload(payload)

    def revoke_token_payload(self, payload: dict) -> None:
        if payload.get("jti"):
            self.db.add(
                RevokedToken(
                    jti=payload["jti"],
                    token_type=payload.get("type", "unknown"),
                    expires_at=utc_now()
                    + timedelta(seconds=max(payload["exp"] - int(utc_now().timestamp()), 0)),
                )
            )
            self.db.commit()

    def _token_pair(self, user: User) -> tuple[str, str]:
        access = create_token(
            user.id,
            "access",
            timedelta(minutes=settings.access_token_expire_minutes),
        )
        refresh = create_token(
            user.id,
            "refresh",
            timedelta(days=settings.refresh_token_expire_days),
        )
        return access, refresh

    def _decode_expected_token(self, token: str, token_type: str) -> dict:
        try:
            payload = decode_token(token)
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
        if payload.get("type") != token_type:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        if self.db.scalar(select(RevokedToken).where(RevokedToken.jti == payload.get("jti"))):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
        return payload
