import pytest
from sqlalchemy.orm import Session

from app.schemas.medicine import MedicineCreate
from app.services.enrichment_service import EnrichmentService
from app.services.medicine_service import MedicineService


class FakeRxNormAdapter:
    async def approximate_match(self, name: str) -> dict:
        return {"rxcui": "161", "score": "95", "name": name}


class FakeOpenFDAAdapter:
    async def label_by_name(self, name: str) -> dict:
        return {
            "effective_time": "20260520",
            "openfda": {"spl_set_id": ["set-123"]},
            "adverse_reactions": ["Public adverse reactions text"],
            "warnings": ["Public warning text"],
            "contraindications": ["Public contraindications text"],
            "indications_and_usage": ["Public usage text"],
        }


@pytest.mark.anyio
async def test_rxnorm_enrichment_updates_empty_rxcui_and_records_source(db: Session) -> None:
    medicine = MedicineService(db).create(MedicineCreate(generic_name="Acetaminophen"))

    result = await EnrichmentService(db, rxnorm=FakeRxNormAdapter()).enrich_rxnorm(medicine.id)

    assert result.medicine.rx_cui == "161"
    assert result.source is not None
    assert result.source.source_name == "RxNorm"
    assert "rx_cui" in result.updated_fields


@pytest.mark.anyio
async def test_openfda_enrichment_preserves_local_fields(db: Session) -> None:
    medicine = MedicineService(db).create(
        MedicineCreate(
            generic_name="Paracetamol",
            side_effects="Local side effects text",
            precautions=None,
        )
    )

    result = await EnrichmentService(db, openfda=FakeOpenFDAAdapter()).enrich_openfda_label(medicine.id)

    assert result.medicine.side_effects == "Local side effects text"
    assert result.medicine.precautions == "Public warning text"
    assert "side_effects" in result.skipped_fields
    assert "precautions" in result.updated_fields
    assert result.source is not None
    assert result.source.source_record_id == "set-123"

