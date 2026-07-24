"""add attempts column to otp_codes

Revision ID: 0003_otp_attempts
Revises: 0002_medicine_sources
Create Date: 2026-05-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_otp_attempts"
down_revision: str | None = "0002_medicine_sources"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "otp_codes",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("otp_codes", "attempts")
