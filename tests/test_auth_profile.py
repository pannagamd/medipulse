from fastapi.testclient import TestClient


def test_profile_is_user_scoped_and_upsertable(client: TestClient) -> None:
    response = client.put(
        "/api/v1/profile",
        json={
            "age": 28,
            "gender": "female",
            "weight_kg": 55,
            "allergies": "penicillin",
            "medical_conditions": "asthma",
            "current_medications": "salbutamol",
        },
    )

    assert response.status_code == 200
    assert response.json()["allergies"] == "penicillin"

    response = client.get("/api/v1/profile")
    assert response.status_code == 200
    assert response.json()["age"] == 28

