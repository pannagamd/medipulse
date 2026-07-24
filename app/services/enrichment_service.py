import json

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.medicine import Medicine, MedicineSource
from app.schemas.enrichment import EnrichmentResult
from app.services.external.openfda import OpenFDAAdapter
from app.services.external.rxnorm import RxNormAdapter
from app.services.medicine_service import MedicineService


class EnrichmentService:
    def __init__(
        self,
        db: Session,
        rxnorm: RxNormAdapter | None = None,
        openfda: OpenFDAAdapter | None = None,
    ):
        self.db = db
        self.rxnorm = rxnorm or RxNormAdapter()
        self.openfda = openfda or OpenFDAAdapter()

    async def enrich_rxnorm(self, medicine_id: str) -> EnrichmentResult:
        medicine = self._get_medicine(medicine_id)
        try:
            candidate = await self.rxnorm.approximate_match(medicine.generic_name)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RxNorm service is unavailable after retries. Try again later.",
            ) from exc
        if not candidate:
            return EnrichmentResult(medicine=medicine, message="No RxNorm match found")

        updated_fields: list[str] = []
        rxcui = str(candidate.get("rxcui") or "").strip()
        if rxcui and not medicine.rx_cui:
            medicine.rx_cui = rxcui
            updated_fields.append("rx_cui")

        source = self._add_source(
            medicine=medicine,
            source_name="RxNorm",
            source_record_id=rxcui or None,
            source_url="https://rxnav.nlm.nih.gov/",
            confidence=float(candidate.get("score", 80)) / 100 if candidate.get("score") else 0.8,
            payload=candidate,
        )
        self.db.commit()
        self.db.refresh(medicine)
        return EnrichmentResult(
            medicine=medicine,
            source=source,
            updated_fields=updated_fields,
            skipped_fields=[] if updated_fields else ["rx_cui"],
            message="RxNorm enrichment completed",
        )

    async def enrich_openfda_label(self, medicine_id: str) -> EnrichmentResult:
        medicine = self._get_medicine(medicine_id)
        try:
            label = await self.openfda.label_by_name(medicine.generic_name)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="openFDA service is unavailable after retries. Try again later.",
            ) from exc
        if not label:
            return EnrichmentResult(medicine=medicine, message="No openFDA label found")

        field_map = {
            "side_effects": "adverse_reactions",
            "precautions": "warnings",
            "contraindications": "contraindications",
            "usage_guidelines": "indications_and_usage",
            "storage_instructions": "storage_and_handling",
        }
        updated_fields: list[str] = []
        skipped_fields: list[str] = []
        for local_field, fda_field in field_map.items():
            current_value = getattr(medicine, local_field)
            incoming_value = self._first_text(label.get(fda_field))
            if incoming_value and not current_value:
                setattr(medicine, local_field, incoming_value)
                updated_fields.append(local_field)
            elif incoming_value:
                skipped_fields.append(local_field)

        openfda = label.get("openfda", {})
        source = self._add_source(
            medicine=medicine,
            source_name="openFDA",
            source_record_id=self._first_text(openfda.get("spl_set_id")),
            source_url="https://open.fda.gov/apis/drug/label/",
            source_date=self._first_text(label.get("effective_time")),
            confidence=0.65,
            payload=label,
        )
        self.db.commit()
        self.db.refresh(medicine)
        return EnrichmentResult(
            medicine=medicine,
            source=source,
            updated_fields=updated_fields,
            skipped_fields=skipped_fields,
            message="openFDA label enrichment completed; local non-empty fields were preserved",
        )

    def _get_medicine(self, medicine_id: str) -> Medicine:
        medicine = MedicineService(self.db).get(medicine_id)
        if not medicine:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
        return medicine

    def _add_source(
        self,
        medicine: Medicine,
        source_name: str,
        payload: dict,
        source_record_id: str | None = None,
        source_url: str | None = None,
        source_version: str | None = None,
        source_date: str | None = None,
        confidence: float = 0.8,
    ) -> MedicineSource:
        source = MedicineSource(
            medicine_id=medicine.id,
            source_name=source_name,
            source_record_id=source_record_id,
            source_url=source_url,
            source_version=source_version,
            source_date=source_date,
            confidence=max(0, min(confidence, 1)),
            payload_json=json.dumps(payload, ensure_ascii=True),
        )
        self.db.add(source)
        self.db.flush()
        return source

    def _first_text(self, value: object) -> str | None:
        if isinstance(value, list) and value:
            return str(value[0]).strip()
        if isinstance(value, str) and value.strip():
            return value.strip()
        return None

