FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md requirements.txt ./
COPY app ./app
COPY alembic ./alembic
COPY scripts ./scripts
COPY data ./data
COPY alembic.ini ./alembic.ini

# Copy full medicine data files at root level (A/B/C standalone + dosage + symptoms + D-Z ZIP)
COPY All_A_Medicines_With_Food_Interactions.xlsx ./
COPY All_B_Medicines_With_Food_Interactions.xlsx ./
COPY All_C_Medicines_With_Food_Interactions.xlsx ./
COPY ab.xlsx ./
COPY symptoms.xlsx ./
COPY workspace-*.zip ./

# Copy the checkfordata/ subfolder (contains drug-drug-interactions + canonical versions of A/B/C/dosage)
COPY checkfordata ./checkfordata

RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -e .

EXPOSE 8000

# 1. Run Alembic migrations (creates/updates schema)
# 2. Seed base data: admin user + symptom rules + sample medicines
# 3. Seed full medicine catalog from Excel/ZIP files (idempotent — skips if already populated)
# 4. Seed drug-drug interactions from checkfordata/ (idempotent — skips if already populated)
# 5. Start the API server
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py && python scripts/seed_data.py && python scripts/seed_interactions.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
