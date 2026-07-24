from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utc_now
from app.db.base import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    source_name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    filename: Mapped[str | None] = mapped_column(String(255))
    records_total: Mapped[int] = mapped_column(default=0, nullable=False)
    records_imported: Mapped[int] = mapped_column(default=0, nullable=False)
    errors: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    created_by_user_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (
        Index("ix_medicines_generic_brand", "generic_name", "brand_name"),
        Index("ix_medicines_composition", "composition"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    generic_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    brand_name: Mapped[str | None] = mapped_column(String(255), index=True)
    composition: Mapped[str | None] = mapped_column(Text)
    dosage_form: Mapped[str | None] = mapped_column(String(120))
    strength: Mapped[str | None] = mapped_column(String(120))
    side_effects: Mapped[str | None] = mapped_column(Text)
    precautions: Mapped[str | None] = mapped_column(Text)
    contraindications: Mapped[str | None] = mapped_column(Text)
    storage_instructions: Mapped[str | None] = mapped_column(Text)
    usage_guidelines: Mapped[str | None] = mapped_column(Text)
    source_name: Mapped[str] = mapped_column(String(120), default="local", nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_version: Mapped[str | None] = mapped_column(String(120))
    source_date: Mapped[str | None] = mapped_column(String(60))
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    rx_cui: Mapped[str | None] = mapped_column(String(80), index=True)
    import_batch_id: Mapped[str | None] = mapped_column(ForeignKey("import_batches.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    aliases: Mapped[list["MedicineAlias"]] = relationship(
        back_populates="medicine",
        cascade="all, delete-orphan",
    )
    sources: Mapped[list["MedicineSource"]] = relationship(
        back_populates="medicine",
        cascade="all, delete-orphan",
    )


class MedicineAlias(Base):
    __tablename__ = "medicine_aliases"
    __table_args__ = (Index("ix_medicine_aliases_alias", "alias"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    medicine_id: Mapped[str] = mapped_column(ForeignKey("medicines.id", ondelete="CASCADE"))
    alias: Mapped[str] = mapped_column(String(255), nullable=False)
    alias_type: Mapped[str] = mapped_column(String(50), default="other", nullable=False)
    source_name: Mapped[str] = mapped_column(String(120), default="local", nullable=False)

    medicine: Mapped[Medicine] = relationship(back_populates="aliases")


class MedicineSource(Base):
    __tablename__ = "medicine_sources"
    __table_args__ = (
        Index("ix_medicine_sources_medicine_source", "medicine_id", "source_name"),
        Index("ix_medicine_sources_record", "source_name", "source_record_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    medicine_id: Mapped[str] = mapped_column(ForeignKey("medicines.id", ondelete="CASCADE"))
    source_name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_record_id: Mapped[str | None] = mapped_column(String(255))
    source_url: Mapped[str | None] = mapped_column(Text)
    source_version: Mapped[str | None] = mapped_column(String(120))
    source_date: Mapped[str | None] = mapped_column(String(60))
    confidence: Mapped[float] = mapped_column(Float, default=0.8, nullable=False)
    payload_json: Mapped[str | None] = mapped_column(Text)
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    medicine: Mapped[Medicine] = relationship(back_populates="sources")
