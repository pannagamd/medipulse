# Firebase Phone Authentication

This project uses **Firebase Authentication (phone/SMS OTP)** on the client and **Firebase Admin SDK** on the FastAPI backend. The backend never trusts the client alone—it verifies the Firebase ID token and then issues application JWTs.

## Install dependencies

**Backend:**

```powershell
cd "e:\IPW Project\ProjectFixed"
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

**Frontend:**

```powershell
cd frontend
npm install
```

## Firebase Console setup

1. Create a project at [https://console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method → Phone** → Enable.
3. **Project settings → General** → add a **Web app** and copy the Firebase config values into `frontend/.env`.
4. **Project settings → Service accounts** → **Generate new private key** → save JSON as `firebase-service-account.json` (do not commit).
5. Add authorized domains for local dev: `localhost`, `127.0.0.1`.
6. For production SMS, upgrade to the Blaze plan and configure your app identity / SHA keys as required by Firebase.

## Environment variables

**Backend (`.env`):**

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
# Or inline JSON (single line):
# FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}

SEED_ADMIN_PHONE=+919876543210
SEED_ADMIN_FULL_NAME=MediPulse Admin
```

**Frontend (`frontend/.env`):**

```env
VITE_API_BASE_URL=/api/v1
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Database migration

```powershell
alembic upgrade head
python scripts/seed.py
```

Migration `0004_firebase_phone_auth` drops `otp_codes`, adds `phone_number` / `firebase_uid`, and removes `is_verified`.

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/firebase` | Body: `{ "id_token": "...", "full_name": "optional" }` → JWT pair + user |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token |
| `GET` | `/api/v1/auth/me` | Current user |

## Testing

**Backend unit tests (mocked Firebase verify):**

```powershell
pytest tests/test_auth_firebase.py -v
```

**Manual end-to-end:**

1. Start API: `uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open `/auth/login`, enter E.164 phone (e.g. `+1…`), complete SMS OTP.
4. Confirm redirect to `/app` and `GET /auth/me` returns your `phone_number`.

Use Firebase **test phone numbers** (Authentication → Sign-in method → Phone → test numbers) to avoid real SMS in development.

## Security notes

- Only **phone** sign-in provider tokens are accepted server-side.
- Invalid or expired Firebase tokens return `401`.
- Application JWTs and refresh revocation behave as before.
