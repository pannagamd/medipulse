"""Firebase Admin SDK — server-side ID token verification."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from firebase_admin.exceptions import FirebaseError

from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app: firebase_admin.App | None = None


def _load_credential() -> credentials.Base | None:
    if settings.firebase_credentials_json:
        payload = json.loads(settings.firebase_credentials_json)
        return credentials.Certificate(payload)
    if settings.firebase_credentials_path:
        return credentials.Certificate(settings.firebase_credentials_path)
    if settings.firebase_use_emulator:
        return None
    raise RuntimeError(
        "Firebase credentials not configured. Set FIREBASE_CREDENTIALS_PATH, "
        "FIREBASE_CREDENTIALS_JSON, or FIREBASE_USE_EMULATOR=true for local development."
    )


def get_firebase_app() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is None:
        if settings.firebase_use_emulator:
            os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.firebase_auth_emulator_host
            logger.info("Using Firebase Auth emulator at %s", settings.firebase_auth_emulator_host)

        options = {"projectId": settings.firebase_project_id}
        cred = _load_credential()
        if cred is not None:
            _firebase_app = firebase_admin.initialize_app(cred, options=options)
        else:
            _firebase_app = firebase_admin.initialize_app(options=options)
    return _firebase_app


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """Verify Firebase ID token and return decoded claims."""
    try:
        get_firebase_app()
        check_revoked = not settings.firebase_use_emulator
        decoded = firebase_auth.verify_id_token(id_token, check_revoked=check_revoked)
    except FirebaseError as exc:
        logger.warning("Firebase token verification failed: %s", exc)
        raise ValueError("Invalid or expired Firebase token") from exc
    except ValueError as exc:
        logger.warning("Firebase token rejected: %s", exc)
        raise ValueError("Invalid or expired Firebase token") from exc

    sign_in_provider = decoded.get("firebase", {}).get("sign_in_provider")
    if sign_in_provider != "phone":
        raise ValueError("Token was not issued for phone authentication")

    phone_number = decoded.get("phone_number")
    if not phone_number:
        raise ValueError("Verified phone number missing from token")

    return decoded
