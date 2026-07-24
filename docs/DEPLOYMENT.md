# Production Deployment Guide — Smart Drug Safety

> Last updated: 2026-05-26  
> Covers: Render.com, Docker, local development

---

## Overview

The deployment pipeline has **5 ordered steps** that run automatically on every container start:

```
1. alembic upgrade head          ← apply DB schema migrations
2. python scripts/seed.py        ← create admin user + symptom rules
3. python scripts/seed_data.py   ← import 1,159 medicines from checkfordata/
4. python scripts/seed_interactions.py  ← import 192 drug-drug interactions
5. uvicorn app.main:app ...      ← start the API server
```

All seed scripts are **idempotent** — safe to run on every container start without duplicating data.

---

## Dataset Files (Required in Production)

All data files must be present in the Docker image. The `Dockerfile` handles this automatically.

| File | Location in Repo | Purpose |
|------|-----------------|---------|
| `All_A_Medicines_With_Food_Interactions.xlsx` | `checkfordata/` | Medicine catalog A |
| `All_B_Medicines_With_Food_Interactions.xlsx` | `checkfordata/` | Medicine catalog B |
| `All_C_Medicines_With_Food_Interactions.xlsx` | `checkfordata/` | Medicine catalog C |
| `ab.xlsx` | `checkfordata/` | Dosage data (A–Z, 1,527 entries) |
| `drug-drug-interactions-formatted.xlsx` | `checkfordata/` | 196 drug-drug interactions |
| `symptoms.xlsx` | project root | Symptom rules |
| `workspace-*.zip` | project root | D–Z medicine catalog (optional) |

> **Important**: The `checkfordata/` directory is copied into the image by the Dockerfile.  
> Do NOT add `checkfordata/` to `.dockerignore`.

---

## Environment Variables

Copy `.env.example` to `.env` and set these before deploying:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. Render provides this automatically. |
| `SECRET_KEY` | ✅ | JWT signing key — use a long random string in production |
| `SEED_ADMIN_PHONE` | ✅ | Admin account phone (E.164 Indian format, e.g. `+919876543210`) |
| `SEED_ADMIN_PASSWORD` | ✅ | Admin account password (min 6 chars) |
| `SEED_ADMIN_FULL_NAME` | optional | Display name for admin |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed frontend origins |
| `ENVIRONMENT` | optional | `production` or `development` (default: `development`) |
| `FIREBASE_PROJECT_ID` | optional | For Firebase phone auth |
| `FIREBASE_CREDENTIALS_JSON` | optional | Firebase service account JSON (base64 or raw) |

---

## Render.com Deployment

### First-time Setup

1. **Create a new Web Service** on Render, connect your GitHub repo.

2. **Set Build Command**:
   ```
   pip install -r requirements.txt && pip install -e .
   ```

3. **Set Start Command**:
   ```
   alembic upgrade head && python scripts/seed.py && python scripts/seed_data.py && python scripts/seed_interactions.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. **Add a PostgreSQL database** in Render. Copy the "Internal Database URL" and set it as `DATABASE_URL` in your service environment variables.

5. **Set all required environment variables** in the Render dashboard → Environment tab.

6. **Deploy** — Render will build the image, run migrations, seed data, and start the server.

### Post-Deploy Verification

After each deploy, check these URLs:

```
GET https://your-app.onrender.com/health
```

Expected response (healthy):
```json
{
  "status": "ok",
  "environment": "production",
  "db": "ok",
  "counts": {
    "medicines": 1159,
    "interactions": 192,
    "users": 1
  },
  "warnings": []
}
```

If `status` is `"degraded"`, the `warnings` array will explain which seed script to rerun.

### Manual Re-seed on Render

If the DB is empty after deploy (e.g. after a DB reset), use Render's **Shell** tab:

```bash
# Full re-seed (bypasses idempotency guards)
python scripts/seed.py
python scripts/seed_data.py --force    # not yet implemented, run on empty DB only
python scripts/seed_interactions.py --force
```

> The `--force` flag on `seed_interactions.py` bypasses the idempotency check.  
> `seed_data.py` uses a threshold of 10 medicines — it auto-seeds on empty DBs.

---

## Docker Deployment

### Build and Run Locally

```bash
# Build
docker build -t smart-drug-safety .

# Run with PostgreSQL (update the DATABASE_URL)
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql+psycopg://user:pass@host:5432/dbname" \
  -e SECRET_KEY="your-secret-key" \
  -e SEED_ADMIN_PHONE="+919876543210" \
  -e SEED_ADMIN_PASSWORD="MediPulse@2024" \
  smart-drug-safety
```

### Docker Compose (Local Development)

```bash
cp .env.example .env
docker compose up --build
```

---

## Local Development Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env

# Apply schema
alembic upgrade head

# Seed base data (admin + symptom rules)
python scripts/seed.py

# Seed medicine catalog from checkfordata/
python scripts/seed_data.py

# Seed drug-drug interactions from checkfordata/
python scripts/seed_interactions.py

# Start dev server
python -m uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

---

## Seed Script Reference

### `scripts/seed.py`
- Creates the admin user (from `SEED_ADMIN_PHONE` / `SEED_ADMIN_PASSWORD`)
- Seeds default symptom rules
- **Idempotent**: safe to run multiple times

### `scripts/seed_data.py`
- Reads medicine catalog from `checkfordata/` (A, B, C xlsx files + ab.xlsx dosage)
- Imports medicine names, brand names, drug class, symptoms, food interactions
- **Idempotency guard**: skips if DB already has > 10 medicines
- To force re-run on an empty DB: just delete medicines or use a fresh DB

### `scripts/seed_interactions.py`
- Reads `checkfordata/drug-drug-interactions-formatted.xlsx`
- Imports 196 drug-drug interaction pairs with severity and recommendations
- **Idempotency guard**: skips if DB already has > 10 interactions
- **Force flag**: `python scripts/seed_interactions.py --force` bypasses the guard
- **Dry-run flag**: `python scripts/seed_interactions.py --dry-run` shows what would be imported

---

## Startup Log Verification

On every server start, check the logs for these lines:

**Healthy startup:**
```
INFO  Startup DB diagnostics: users=1 profiles=0 medicines=1159 interactions=192
INFO  Medicine table OK: 1159 records.
INFO  Interaction table OK: 192 records.
```

**Problem — empty interactions:**
```
CRITICAL  STARTUP CRITICAL: Drug interaction table is EMPTY.
          Seeding has not run or failed.
          Run: python scripts/seed_interactions.py
```

**Problem — empty medicines:**
```
CRITICAL  STARTUP CRITICAL: Medicine table is EMPTY.
          Seeding has not run or failed.
          Run: python scripts/seed_data.py
```

---

## Deployment Checklist

Use after every production deploy:

- [ ] `GET /health` returns `status: ok`
- [ ] `counts.medicines` ≥ 100
- [ ] `counts.interactions` ≥ 50
- [ ] `warnings` array is empty
- [ ] Medicine search returns results (`GET /api/v1/medicines/search?q=aspirin`)
- [ ] Interaction check returns matched results (`POST /api/v1/interactions/analyze`)
- [ ] Auth login works (`POST /api/v1/auth/login`)
- [ ] No CRITICAL or ERROR lines in startup logs
- [ ] Frontend can reach the API (check CORS_ORIGINS env var)

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `/health` returns `status: degraded` | Seed didn't run | Check startup logs; run seed scripts manually |
| Interaction check always returns `unknown` | Interactions table empty | Run `python scripts/seed_interactions.py` |
| `KeyError: 'high'` in logs | Old code before Phase 4 fix | Redeploy latest code |
| `422 Unprocessable Entity` on login | Using `phone_number` field instead of `username` | Use `{"username": "+919876543210", "password": "..."}` |
| DB empty after Render redeploy | Render free-tier DB resets | Add `DATABASE_URL` env var pointing to persistent PostgreSQL |
| `checkfordata/` not found in container | Missing COPY in Dockerfile | Ensure `COPY checkfordata ./checkfordata` is in Dockerfile |
