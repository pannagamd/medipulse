"""
Comprehensive end-to-end test script for Smart Drug Safety API.
Covers: Auth, Medicine CRUD+Search, Brand-to-Generic, Interactions,
        Profile, Pregnancy Safety Filter, and Symptom Suggestions.

Run: python scripts/e2e_test.py
"""

import json
import sys
import textwrap
import time
import httpx

BASE = "http://127.0.0.1:8000/api/v1"
HEALTH = "http://127.0.0.1:8000/health"

PASS = "\033[92m✔\033[0m"
FAIL = "\033[91m✘\033[0m"
INFO = "\033[94m➜\033[0m"

results: list[tuple[bool, str]] = []


def check(label: str, cond: bool, extra: str = "") -> bool:
    tag = PASS if cond else FAIL
    msg = f"  {tag} {label}"
    if extra and not cond:
        msg += f"\n      {extra}"
    print(msg)
    results.append((cond, label))
    return cond


def section(title: str) -> None:
    print(f"\n{'─'*60}")
    print(f"  {INFO} {title}")
    print(f"{'─'*60}")


def req(method: str, path: str, token: str | None = None, **kwargs) -> httpx.Response:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return httpx.request(method, f"{BASE}{path}", headers=headers, timeout=10, **kwargs)


# ─── HEALTH ───────────────────────────────────────────────────────────────────
section("Health check")
r = httpx.get(HEALTH, timeout=5)
check("GET /health → 200", r.status_code == 200)
check("status=ok", r.json().get("status") == "ok")

# ─── AUTH ─────────────────────────────────────────────────────────────────────
section("Auth — Firebase phone / JWT")

r = req("POST", "/auth/firebase", json={"id_token": "not-a-valid-firebase-token"})
check("Invalid Firebase token → 401", r.status_code == 401, r.text)


def _admin_tokens_from_db() -> tuple[str, str]:
    from datetime import timedelta

    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session

    from app.core.config import settings
    from app.core.security import create_token
    from app.models.user import User

    engine = create_engine(settings.database_url)
    with Session(engine) as session:
        admin = session.scalar(select(User).where(User.is_admin.is_(True)))
        if not admin:
            return "", ""
        access = create_token(admin.id, "access", timedelta(minutes=30))
        refresh = create_token(admin.id, "refresh", timedelta(days=7))
        return access, refresh


try:
    ACCESS, REFRESH = _admin_tokens_from_db()
except Exception as exc:  # noqa: BLE001
    print(f"    Could not load admin JWT from database: {exc}")
    ACCESS, REFRESH = "", ""

check("Seeded admin access token available", bool(ACCESS))
check("Seeded admin refresh token available", bool(REFRESH))

r = req("GET", "/auth/me", token=ACCESS)
check("GET /auth/me → 200", r.status_code == 200, r.text)
if r.status_code == 200:
    check("is_admin=True for admin", r.json().get("is_admin") is True)
    check("phone_number present", bool(r.json().get("phone_number")))

r = req("POST", "/auth/refresh", json={"refresh_token": REFRESH})
check("POST /auth/refresh → 200", r.status_code == 200, r.text)
if r.status_code == 200:
    ACCESS = r.json()["access_token"]
    REFRESH = r.json()["refresh_token"]

section("Auth — validation rules")

r = req("POST", "/auth/firebase", json={"id_token": ""})
check("Empty Firebase token rejected → 422", r.status_code == 422, r.text)

# ─── MEDICINES ────────────────────────────────────────────────────────────────
section("Medicines — search + get")

r = req("GET", "/medicines/search?q=para", token=ACCESS)
check("GET /medicines/search?q=para → 200", r.status_code == 200, r.text)
check("search returns total + items", "total" in r.json() and "items" in r.json())
medicines = r.json().get("items", [])
MEDICINE_ID = medicines[0]["id"] if medicines else None
print(f"    Found {r.json().get('total', 0)} medicines for 'para'")

if MEDICINE_ID:
    r = req("GET", f"/medicines/{MEDICINE_ID}", token=ACCESS)
    check(f"GET /medicines/{{id}} → 200", r.status_code == 200, r.text)

r = req("GET", "/medicines/zzznobrand-doesnotexist", token=ACCESS)
check("GET /medicines/nonexistent → 404", r.status_code == 404, r.text)

# ─── BRAND-TO-GENERIC ─────────────────────────────────────────────────────────
section("Brand-to-Generic Medicine Identification")

# Search by brand name (if any medicine has a brand_name in DB)
r = req("GET", "/medicines/search?q=para", token=ACCESS)
para_items = r.json().get("items", []) if r.status_code == 200 else []
brand_to_test = None
for item in para_items:
    if item.get("brand_name"):
        brand_to_test = item["brand_name"]
        break

if brand_to_test:
    r = req("GET", f"/medicines/brand-to-generic?brand={brand_to_test}", token=ACCESS)
    check(f"GET /brand-to-generic?brand={brand_to_test} → 200", r.status_code == 200, r.text)
    result = r.json()
    check("Returns a list", isinstance(result, list), str(result))
    if result:
        first = result[0]
        check("brand_input field present", "brand_input" in first)
        check("generic_name field present", "generic_name" in first)
        check("medicine_id field present", "medicine_id" in first)
        print(f"    brand '{brand_to_test}' → generic '{first.get('generic_name')}'")
else:
    # Still test the endpoint structure with a known term
    r = req("GET", "/medicines/brand-to-generic?brand=para", token=ACCESS)
    print(f"    No brand_name in seed data — testing with 'para': status={r.status_code}")
    if r.status_code == 200:
        first = r.json()[0] if r.json() else {}
        check("brand_input field present", "brand_input" in first)
        check("generic_name field present", "generic_name" in first)
        check("medicine_id field present", "medicine_id" in first)
    else:
        check("brand-to-generic returns 404 when nothing found", r.status_code == 404, r.text)

# 404 for completely unknown brand
r = req("GET", "/medicines/brand-to-generic?brand=zzznobrand999", token=ACCESS)
check("GET /brand-to-generic?brand=zzznobrand999 → 404", r.status_code == 404, r.text)

# Missing brand param → 422
r = req("GET", "/medicines/brand-to-generic", token=ACCESS)
check("GET /brand-to-generic (no param) → 422", r.status_code == 422, r.text)

# ─── INTERACTIONS ─────────────────────────────────────────────────────────────
section("Drug Interactions")

r = req("POST", "/interactions/analyze",
        token=ACCESS,
        json={"medicines": ["Paracetamol", "Ibuprofen"], "include_profile_context": False})
check("POST /interactions/analyze → 200", r.status_code == 200, r.text)
if r.status_code == 200:
    body = r.json()
    check("results list present", isinstance(body.get("results"), list))
    check("resolved_medicines present", isinstance(body.get("resolved_medicines"), list))
    check("overall_severity present", "overall_severity" in body)
    check("medical_disclaimer present", "medical_disclaimer" in body)

# Too few medicines (min=2)
r = req("POST", "/interactions/analyze", token=ACCESS,
        json={"medicines": ["Paracetamol"]})
check("analyze with <2 medicines → 422", r.status_code == 422, r.text)

# ─── HEALTH PROFILE ───────────────────────────────────────────────────────────
section("Health Profile")

r = req("GET", "/profile", token=ACCESS)
check("GET /profile → 200", r.status_code == 200, r.text)

# Upsert profile — male
r = req("PUT", "/profile", token=ACCESS,
        json={"age": 35, "gender": "male", "weight_kg": 75.0,
              "allergies": None, "is_pregnant": False})
check("PUT /profile (male) → 200", r.status_code == 200, r.text)

# Confirm no pregnancy warnings in interactions for male profile
r = req("POST", "/interactions/analyze", token=ACCESS,
        json={"medicines": ["Paracetamol", "Ibuprofen"], "include_profile_context": True})
if r.status_code == 200:
    warnings = r.json().get("profile_warnings", [])
    preg_warns = [w for w in warnings if "pregnancy" in w.get("message", "").lower()
                  or "female" in w.get("message", "").lower()]
    check("Male profile: no pregnancy warnings in interactions", len(preg_warns) == 0,
          f"Got: {preg_warns}")

# ─── PREGNANCY SAFETY FILTER ──────────────────────────────────────────────────
section("Pregnancy Safety Filter — gender=female triggers filter")

# Set profile to female, is_pregnant NOT set
r = req("PUT", "/profile", token=ACCESS,
        json={"age": 28, "gender": "female", "weight_kg": 60.0,
              "allergies": None, "is_pregnant": None})
check("PUT /profile (female, is_pregnant=null) → 200", r.status_code == 200, r.text)

# Interactions with female profile — should carry pregnancy advisory
r = req("POST", "/interactions/analyze", token=ACCESS,
        json={"medicines": ["Paracetamol", "Ibuprofen"], "include_profile_context": True})
check("POST /interactions/analyze (female profile) → 200", r.status_code == 200, r.text)
if r.status_code == 200:
    warnings = r.json().get("profile_warnings", [])
    preg_warns = [w for w in warnings if "female" in w.get("message", "").lower()
                  or "pregnancy" in w.get("message", "").lower()]
    check("Female profile: pregnancy advisory warning present in interactions", len(preg_warns) > 0,
          f"All warnings: {warnings}")
    if preg_warns:
        check("Advisory is severity=moderate", preg_warns[0]["severity"] == "moderate",
              str(preg_warns[0]))

# Profile safety-check — female profile
r = req("POST", "/profile/safety-check", token=ACCESS,
        json={"medicines": ["Paracetamol"]})
check("POST /profile/safety-check (female) → 200", r.status_code == 200, r.text)
if r.status_code == 200:
    warnings = r.json().get("profile_warnings", [])
    preg_warns = [w for w in warnings if "female" in w.get("message", "").lower()
                  or "pregnancy" in w.get("message", "").lower()]
    check("Female profile: pregnancy advisory in safety-check", len(preg_warns) > 0,
          f"All warnings: {warnings}")

# Now set is_pregnant=True — warnings should escalate to dangerous
r = req("PUT", "/profile", token=ACCESS,
        json={"gender": "female", "is_pregnant": True})
check("PUT /profile (female, is_pregnant=True) → 200", r.status_code == 200, r.text)

r = req("POST", "/interactions/analyze", token=ACCESS,
        json={"medicines": ["Paracetamol", "Ibuprofen"], "include_profile_context": True})
if r.status_code == 200:
    warnings = r.json().get("profile_warnings", [])
    preg_warns = [w for w in warnings if "pregnancy" in w.get("message", "").lower()
                  or "female" in w.get("message", "").lower()]
    check("is_pregnant=True: pregnancy warning present", len(preg_warns) > 0,
          f"All warnings: {warnings}")
    print(f"    Warnings: {[w['severity']+': '+w['message'][:60] for w in preg_warns]}")

# ─── SYMPTOM SUGGESTIONS ──────────────────────────────────────────────────────
section("Symptom Suggestions + Pregnancy filter in symptoms")

# Reset profile to female, no pregnancy
r = req("PUT", "/profile", token=ACCESS,
        json={"gender": "female", "is_pregnant": None})

r = req("POST", "/symptoms/suggest", token=ACCESS,
        json={"symptoms": ["fever", "body ache"], "include_saved_profile": True})
check("POST /symptoms/suggest → 200", r.status_code == 200, r.text)
if r.status_code == 200:
    body = r.json()
    check("suggestions list present", isinstance(body.get("suggestions"), list))
    check("medical_disclaimer present", "medical_disclaimer" in body)
    check("emergency_warning present", "emergency_warning" in body)
    warnings = body.get("profile_warnings", [])
    preg_warns = [w for w in warnings if "female" in w.get("message", "").lower()
                  or "pregnancy" in w.get("message", "").lower()]
    check("Female profile: pregnancy advisory in symptom suggestions", len(preg_warns) > 0,
          f"All warnings: {warnings}")
    print(f"    Suggestions: {[s['possible_condition'] for s in body.get('suggestions', [])]}")

# Male profile — no pregnancy advisory in symptoms
r = req("PUT", "/profile", token=ACCESS,
        json={"gender": "male", "is_pregnant": False})
r = req("POST", "/symptoms/suggest", token=ACCESS,
        json={"symptoms": ["fever", "body ache"], "include_saved_profile": True})
if r.status_code == 200:
    warnings = r.json().get("profile_warnings", [])
    preg_warns = [w for w in warnings if "female" in w.get("message", "").lower()
                  or "pregnancy" in w.get("message", "").lower()]
    check("Male profile: no pregnancy advisory in symptoms", len(preg_warns) == 0,
          f"Got: {preg_warns}")

# ─── LOGOUT ───────────────────────────────────────────────────────────────────
section("Logout + token revocation")

r = req("POST", "/auth/logout", json={"refresh_token": REFRESH})
check("POST /auth/logout → 200", r.status_code == 200, r.text)

# Old refresh token should now be revoked
r = req("POST", "/auth/refresh", json={"refresh_token": REFRESH})
check("Revoked refresh token rejected → 401", r.status_code == 401, r.text)

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
print(f"\n{'═'*60}")
passed = sum(1 for ok, _ in results if ok)
failed = sum(1 for ok, _ in results if not ok)
print(f"  RESULTS: {PASS} {passed} passed   {FAIL} {failed} failed   (total {len(results)})")
if failed:
    print("\n  FAILED TESTS:")
    for ok, label in results:
        if not ok:
            print(f"    {FAIL} {label}")
print(f"{'═'*60}\n")
sys.exit(0 if failed == 0 else 1)
