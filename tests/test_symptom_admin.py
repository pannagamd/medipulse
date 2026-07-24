from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.main import app
from app.models.health_profile import HealthProfile
from app.models.user import User


def test_admin_can_create_and_list_symptom_rules(
    client: TestClient,
    admin: User,
) -> None:
    app.dependency_overrides[get_admin_user] = lambda: admin
    response = client.post(
        "/api/v1/symptoms/rules",
        json={
            "name": "Fever care",
            "symptom_keywords": "fever;chills",
            "possible_condition": "Fever",
            "care_recommendations": "Hydrate;Rest",
            "common_medicines": "Paracetamol",
            "precautions": "Avoid overdose",
            "escalation_triggers": "very high fever",
            "is_emergency": False,
        },
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Fever care"

    response = client.get("/api/v1/symptoms/rules")
    assert response.status_code == 200
    assert response.json()[0]["possible_condition"] == "Fever"


def test_symptom_suggestion_includes_profile_context_warning(
    client: TestClient,
    db: Session,
    user: User,
) -> None:
    from app.models.symptom import SymptomRule

    db.add(
        HealthProfile(
            user_id=user.id,
            allergies="paracetamol",
        )
    )
    db.add(
        SymptomRule(
            name="Fever care",
            symptom_keywords="fever",
            possible_condition="Fever",
            care_recommendations="Hydrate;Rest",
            common_medicines="Paracetamol",
        )
    )
    db.commit()

    response = client.post("/api/v1/symptoms/suggest", json={"symptoms": ["fever"]})

    assert response.status_code == 200
    body = response.json()
    assert body["profile_warnings"]
    assert body["profile_warnings"][0]["medicine"] == "Paracetamol"
