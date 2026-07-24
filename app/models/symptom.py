from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.security import utc_now
from app.db.base import Base


class SymptomRule(Base):
    __tablename__ = "symptom_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    symptom_keywords: Mapped[str] = mapped_column(Text, nullable=False)
    possible_condition: Mapped[str] = mapped_column(String(255), nullable=False)
    care_recommendations: Mapped[str] = mapped_column(Text, nullable=False)
    common_medicines: Mapped[str | None] = mapped_column(Text)
    precautions: Mapped[str | None] = mapped_column(Text)
    escalation_triggers: Mapped[str | None] = mapped_column(Text)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

