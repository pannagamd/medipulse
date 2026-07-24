"""remove is_lactating from health_profiles

Revision ID: 0005_remove_lactating
Revises: 0004_firebase_phone_auth
Create Date: 2026-05-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_remove_lactating"
down_revision: str | None = "0004_firebase_phone_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("health_profiles") as batch_op:
        batch_op.drop_column("is_lactating")


def downgrade() -> None:
    with op.batch_alter_table("health_profiles") as batch_op:
        batch_op.add_column(sa.Column("is_lactating", sa.Boolean(), nullable=True))
