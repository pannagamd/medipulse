from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.schemas.medicine import MedicineCreate
from app.services.medicine_service import MedicineService


def test_medicine_search_finds_brand_alias_and_composition(client: TestClient, db: Session) -> None:
    MedicineService(db).create(
        MedicineCreate(
            generic_name="Paracetamol",
            brand_name="Calpol",
            composition="Paracetamol 500mg",
            dosage_form="tablet",
            aliases=["Acetaminophen"],
        )
    )

    response = client.get("/api/v1/medicines/search", params={"q": "Calpol"})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["generic_name"] == "Paracetamol"


def test_medicine_detail_returns_aliases(client: TestClient, db: Session) -> None:
    medicine = MedicineService(db).create(
        MedicineCreate(generic_name="Ibuprofen", brand_name="Brufen", aliases=["Ibu"])
    )

    response = client.get(f"/api/v1/medicines/{medicine.id}")

    assert response.status_code == 200
    assert response.json()["aliases"][0]["alias"] == "Ibu"

