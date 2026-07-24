"""add medicine source snapshots

Revision ID: 0002_medicine_sources
Revises: 0001_initial
Create Date: 2026-05-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_medicine_sources"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "medicine_sources",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("medicine_id", sa.String(length=36), sa.ForeignKey("medicines.id", ondelete="CASCADE")),
        sa.Column("source_name", sa.String(length=120), nullable=False),
        sa.Column("source_record_id", sa.String(length=255)),
        sa.Column("source_url", sa.Text()),
        sa.Column("source_version", sa.String(length=120)),
        sa.Column("source_date", sa.String(length=60)),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("payload_json", sa.Text()),
        sa.Column("refreshed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_medicine_sources_medicine_source", "medicine_sources", ["medicine_id", "source_name"])
    op.create_index("ix_medicine_sources_record", "medicine_sources", ["source_name", "source_record_id"])


def downgrade() -> None:
    op.drop_index("ix_medicine_sources_record", table_name="medicine_sources")
    op.drop_index("ix_medicine_sources_medicine_source", table_name="medicine_sources")
    op.drop_table("medicine_sources")

