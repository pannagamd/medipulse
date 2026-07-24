from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.medicine import Medicine, MedicineAlias, MedicineSource
from app.schemas.medicine import MedicineCreate


class MedicineService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: MedicineCreate, import_batch_id: str | None = None) -> Medicine:
        medicine = Medicine(
            generic_name=data.generic_name,
            brand_name=data.brand_name,
            composition=data.composition,
            dosage_form=data.dosage_form,
            strength=data.strength,
            side_effects=data.side_effects,
            precautions=data.precautions,
            contraindications=data.contraindications,
            storage_instructions=data.storage_instructions,
            usage_guidelines=data.usage_guidelines,
            source_name=data.source_name,
            source_url=data.source_url,
            source_version=data.source_version,
            source_date=data.source_date,
            confidence=data.confidence,
            rx_cui=data.rx_cui,
            import_batch_id=import_batch_id,
        )
        self.db.add(medicine)
        self.db.flush()
        for alias in data.aliases:
            self.db.add(MedicineAlias(medicine_id=medicine.id, alias=alias, alias_type="imported"))
        self.db.add(
            MedicineSource(
                medicine_id=medicine.id,
                source_name=data.source_name,
                source_record_id=data.rx_cui,
                source_url=data.source_url,
                source_version=data.source_version,
                source_date=data.source_date,
                confidence=data.confidence,
            )
        )
        self.db.commit()
        self.db.refresh(medicine)
        return medicine

    def search(self, query: str, limit: int = 20, offset: int = 0) -> tuple[int, list[Medicine]]:
        pattern = f"%{query.strip()}%"
        base_where = or_(
            Medicine.generic_name.ilike(pattern),
            Medicine.brand_name.ilike(pattern),
            Medicine.composition.ilike(pattern),
            MedicineAlias.alias.ilike(pattern),
        )
        count_stmt = (
            select(func.count(Medicine.id.distinct()))
            .outerjoin(MedicineAlias)
            .where(base_where)
        )
        total = self.db.scalar(count_stmt) or 0
        stmt = (
            select(Medicine)
            .outerjoin(MedicineAlias)
            .options(selectinload(Medicine.aliases))
            .options(selectinload(Medicine.sources))
            .where(base_where)
            .distinct()
            .order_by(Medicine.generic_name)
            .limit(limit)
            .offset(offset)
        )
        return total, list(self.db.scalars(stmt).all())

    def get(self, medicine_id: str) -> Medicine | None:
        return self.db.scalar(
            select(Medicine)
            .options(selectinload(Medicine.aliases))
            .options(selectinload(Medicine.sources))
            .where(Medicine.id == medicine_id)
        )

    def add_source(
        self,
        medicine_id: str,
        source_name: str,
        source_record_id: str | None = None,
        source_url: str | None = None,
        source_version: str | None = None,
        source_date: str | None = None,
        confidence: float = 0.8,
        payload_json: str | None = None,
    ) -> MedicineSource:
        source = MedicineSource(
            medicine_id=medicine_id,
            source_name=source_name,
            source_record_id=source_record_id,
            source_url=source_url,
            source_version=source_version,
            source_date=source_date,
            confidence=confidence,
            payload_json=payload_json,
        )
        self.db.add(source)
        self.db.commit()
        self.db.refresh(source)
        return source
