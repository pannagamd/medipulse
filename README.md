# Smart Drug Interaction and Safety Backend

FastAPI backend for a local-first medicine safety platform. It supports Firebase phone auth
medicine search, import-ready medicine records, interaction checks, health profiles, and
rule-based symptom suggestions.

## Frontend

A production-ready React + Vite frontend lives in `frontend/`. It uses TypeScript, Tailwind CSS,
shadcn-style UI primitives, Framer Motion, Axios, React Router, Zustand, and React Hook Form
with Zod.

### Frontend Setup

```powershell
Set-Location .\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Production build:

```powershell
Set-Location .\frontend
npm run build
```

### Frontend Environment

Set the API base URL for your FastAPI backend with:

- `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`

### Frontend Architecture

The app is structured for maintainability and scale:

- `src/components/` reusable UI and layout pieces
- `src/pages/` route-level screens
- `src/services/api/` Axios client and backend adapters
- `src/store/` auth/session state
- `src/hooks/` shared React hooks
- `src/lib/` helpers, history storage, parsing, and constants
- `src/types/` typed API contracts

The frontend currently ships with:

- Landing page with hero, trust sections, and medical disclaimer
- Firebase phone OTP sign-in with persistent JWT session state (see `docs/FIREBASE_AUTH.md`)
- Protected dashboard shell
- Medicine search with live debounce, result cards, and detail modal
- Drug interaction checker with severity banners and warnings
- Pregnancy safety workflow with profile-aware checks
- User profile form and local search history

## Stack

- FastAPI + Pydantic v2
- SQLAlchemy 2 + Alembic
- PostgreSQL for development/production
- SQLite-compatible tests
- Firebase Admin SDK verification for phone authentication

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload
```

Open API docs at `http://127.0.0.1:8000/docs`.

## Docker Setup

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The compose setup starts PostgreSQL, applies migrations, seeds the starter admin and symptom
rules, imports the packaged sample medicine and interaction datasets, then runs the API at
`http://127.0.0.1:8000`.

Default seeded admin values are controlled by:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_FULL_NAME`

Change these in `.env` before deploying anywhere beyond local development.

## Deployment Verification Checklist

Use this after every production deploy:

- Frontend reachable
- Backend reachable
- Database connected
- Authentication works
- Medicine search returns results
- Dosage and detail views render correctly
- Refresh persistence works
- No browser console errors
- No failed API requests in the network panel

## Data Policy

The local project dataset is treated as the source of truth. Public resources such as RxNorm,
openFDA/DailyMed, and DDInter are adapter/enrichment sources and must be stored with source
metadata. A missing interaction record is returned as `unknown`, never as `safe`.

## Enrichment Endpoints

Admin-only enrichment endpoints are available after medicines exist locally:

- `POST /api/v1/admin/enrichment/medicines/{medicine_id}/rxnorm`
- `POST /api/v1/admin/enrichment/medicines/{medicine_id}/openfda-label`

RxNorm enrichment fills an empty `rx_cui`. openFDA label enrichment fills only blank label
fields, preserving local dataset values.

## Interaction Analysis

`POST /api/v1/interactions/analyze` checks every pair in the submitted medicine list. The
response includes pair results, resolved local medicine matches, profile warnings, and an
`overall_severity`. Missing records remain `unknown`; they are not treated as safe.

DDInter-style imports normalize drug pairs, so importing `Aspirin + Warfarin` and
`Warfarin + Aspirin` updates one interaction record rather than creating duplicates.

## Profile Safety

`PUT /api/v1/profile` stores user-specific age, weight, allergies, conditions, current
medications, pregnancy, and lactation context. `POST /api/v1/profile/safety-check` checks
one or more medicines against that profile without requiring a full interaction workflow.

Profile warnings inspect medicine names, brand names, composition, contraindications, and
precautions. Warnings are conservative and informational; they do not replace clinician review.

## Symptom Suggestions

`POST /api/v1/symptoms/suggest` runs rule-based symptom matching. Responses include matched
rules, confidence, care recommendations, commonly used medicines, precautions, escalation
triggers, profile-context warnings, and an `urgent` flag.

Admins can manage rules through:

- `GET /api/v1/symptoms/rules`
- `POST /api/v1/symptoms/rules`

## Admin, Audit, and Hardening

Admin/ops endpoints:

- `GET /api/v1/admin/audit`
- `GET /api/v1/admin/imports/batches`

Audit events are recorded for auth, profile updates, safety checks, symptom suggestions,
imports, enrichment, and symptom rule creation. A lightweight in-memory rate limiter is enabled
by default for development and simple deployments; use a shared external limiter for multi-worker
production deployments.

## Import Formats

Admin medicine import accepts CSV, JSON, or XLSX files with columns/keys such as:

- `generic_name`
- `brand_name`
- `composition`
- `dosage_form`
- `strength`
- `side_effects`
- `precautions`
- `contraindications`
- `storage_instructions`
- `usage_guidelines`
- `aliases`

List values may be separated with `;`, `|`, or `,`.

Sample files are available in `data/examples`:

- `medicines_sample.csv`
- `ddinter_sample.csv`
