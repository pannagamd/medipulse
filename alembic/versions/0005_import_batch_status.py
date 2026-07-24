"""add status column to import_batches

Revision ID: 0005_import_batch_status
Revises: 0004_firebase_phone_auth
Create Date: 2026-05-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_import_batch_status"
down_revision: str | None = "0004_firebase_phone_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add status column with default 'completed' for existing rows (they were
    # implicitly successful — the data is already in the DB).
    op.add_column(
        "import_batches",
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="completed",
        ),
    )


def downgrade() -> None:
    op.drop_column("import_batches", "status")
