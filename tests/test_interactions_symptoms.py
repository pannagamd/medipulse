from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.interaction import DrugInteraction
from app.models.symptom import SymptomRule
from app.schemas.medicine import MedicineCreate
from app.services.medicine_service import MedicineService


def test_unknown_interaction_is_not_marked_safe(client: TestClient) -> None:
    response = client.post("/api/v1/interactions/analyze", json={"medicines": ["Drug A", "Drug B"]})

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["severity"] == "unknown"
    assert response.json()["overall_severity"] == "unknown"


def test_known_interaction_returns_source_and_severity(client: TestClient, db: Session) -> None:
    db.add(
        DrugInteraction(
            drug_a_key="aspirin",
            drug_b_key="warfarin",
            drug_a_name="Aspirin",
            drug_b_name="Warfarin",
            severity="dangerous",
            explanation="May increase bleeding risk.",
            recommendations="Avoid unless clinician approves; Monitor bleeding",
            source_name="local",
            confidence=0.9,
        )
    )
    db.commit()

    response = client.post("/api/v1/interactions/analyze", json={"medicines": ["Warfarin", "Aspirin"]})

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["severity"] == "dangerous"
    assert result["sources"][0]["name"] == "local"
    assert result["matched"] is True
    assert response.json()["overall_severity"] == "dangerous"


def test_analysis_resolves_local_medicines_and_warns_on_duplicate_ingredients(
    client: TestClient,
    db: Session,
) -> None:
    service = MedicineService(db)
    first = service.create(
        MedicineCreate(
            generic_name="Paracetamol",
            brand_name="Brand A",
            composition="Paracetamol",
        )
    )
    second = service.create(
        MedicineCreate(
            generic_name="Paracetamol Extended",
            brand_name="Brand B",
            composition="Paracetamol",
        )
    )

    response = client.post(
        "/api/v1/interactions/analyze",
        json={"medicines": [first.id, second.id], "include_profile_context": False},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["resolved_medicines"][0]["matched"] is True
    assert body["resolved_medicines"][0]["brand_name"] == "Brand A"
    assert body["profile_warnings"][0]["severity"] == "moderate"
    assert body["overall_severity"] == "moderate"


def test_symptom_rule_match(client: TestClient, db: Session) -> None:
    db.add(
        SymptomRule(
            name="Common cold",
            symptom_keywords="cough;runny nose",
            possible_condition="Common cold",
            care_recommendations="Rest;Drink fluids",
            common_medicines="Paracetamol",
            precautions="Consult doctor if fever persists",
            escalation_triggers="breathing difficulty",
        )
    )
    db.commit()

    response = client.post("/api/v1/symptoms/suggest", json={"symptoms": ["cough"]})

    assert response.status_code == 200
    assert response.json()["suggestions"][0]["possible_condition"] == "Common cold"
    assert response.json()["suggestions"][0]["confidence"] > 0


def test_symptom_rule_escalation_sets_urgent_flag(client: TestClient, db: Session) -> None:
    db.add(
        SymptomRule(
            name="Respiratory concern",
            symptom_keywords="cough;breathing difficulty",
            possible_condition="Respiratory distress",
            care_recommendations="Seek medical review",
            escalation_triggers="breathing difficulty",
            is_emergency=False,
        )
    )
    db.commit()

    response = client.post("/api/v1/symptoms/suggest", json={"symptoms": ["breathing difficulty"]})

    assert response.status_code == 200
    body = response.json()
    assert body["urgent"] is True
    assert body["suggestions"][0]["seek_medical_care"] is True
    assert body["suggestions"][0]["escalation_triggers"] == ["breathing difficulty"]
