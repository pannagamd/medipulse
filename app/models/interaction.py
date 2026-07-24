from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.security import utc_now
from app.db.base import Base


class DrugInteraction(Base):
    __tablename__ = "drug_interactions"
    __table_args__ = (
        Index("ix_interaction_pair", "drug_a_key", "drug_b_key", unique=True),
        Index("ix_interaction_severity", "severity"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    drug_a_key: Mapped[str] = mapped_column(String(255), nullable=False)
    drug_b_key: Mapped[str] = mapped_column(String(255), nullable=False)
    drug_a_name: Mapped[str] = mapped_column(String(255), nullable=False)
    drug_b_name: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(30), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    mechanism: Mapped[str | None] = mapped_column(Text)
    recommendations: Mapped[str | None] = mapped_column(Text)
    source_name: Mapped[str] = mapped_column(String(120), default="local", nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_version: Mapped[str | None] = mapped_column(String(120))
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

