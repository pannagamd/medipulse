from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.health_profile import HealthProfile
from app.models.user import User
from app.schemas.medicine import MedicineCreate
from app.services.medicine_service import MedicineService


def test_profile_safety_check_flags_composition_allergy(
    client: TestClient,
    db: Session,
    user: User,
) -> None:
    medicine = MedicineService(db).create(
        MedicineCreate(
            generic_name="Amoxicillin",
            brand_name="Mox",
            composition="Amoxicillin; Clavulanic Acid",
        )
    )
    db.add(HealthProfile(user_id=user.id, allergies="clavulanic acid"))
    db.commit()

    response = client.post("/api/v1/profile/safety-check", json={"medicines": [medicine.id]})

    assert response.status_code == 200
    body = response.json()
    assert body["resolved_medicines"][0]["matched"] is True
    assert body["profile_warnings"][0]["severity"] == "dangerous"
    assert "allergy" in body["profile_warnings"][0]["message"].lower()


def test_interaction_analysis_flags_condition_contraindication_and_pregnancy(
    client: TestClient,
    db: Session,
    user: User,
) -> None:
    medicine = MedicineService(db).create(
        MedicineCreate(
            generic_name="Sample NSAID",
            brand_name="PainOff",
            composition="Sample NSAID",
            contraindications="Contraindicated in kidney disease and pregnancy",
            precautions="Use caution in asthma",
        )
    )
    db.add(
        HealthProfile(
            user_id=user.id,
            medical_conditions="kidney disease",
            is_pregnant=True,
        )
    )
    db.commit()

    response = client.post("/api/v1/interactions/analyze", json={"medicines": [medicine.id, "Unknown Drug"]})

    assert response.status_code == 200
    body = response.json()
    warning_messages = " ".join(warning["message"].lower() for warning in body["profile_warnings"])
    assert "kidney disease" in warning_messages
    assert "pregnancy" in warning_messages
    assert body["overall_severity"] == "dangerous"
