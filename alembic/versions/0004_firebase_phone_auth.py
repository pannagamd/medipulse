"""firebase phone auth — drop email OTP, add phone fields

Revision ID: 0004_firebase_phone_auth
Revises: 0003_otp_attempts
Create Date: 2026-05-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_firebase_phone_auth"
down_revision: str | None = "0003_otp_attempts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("otp_codes")

    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("phone_number", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("firebase_uid", sa.String(length=128), nullable=True))

    op.execute(
        "UPDATE users SET phone_number = '+1000' || substr(id, 1, 8) WHERE phone_number IS NULL"
    )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("phone_number", nullable=False)
        batch_op.create_index("ix_users_phone_number", ["phone_number"], unique=True)
        batch_op.create_index("ix_users_firebase_uid", ["firebase_uid"], unique=True)
        batch_op.alter_column("email", existing_type=sa.String(length=255), nullable=True)
        batch_op.alter_column("hashed_password", existing_type=sa.Text(), nullable=True)
        batch_op.drop_column("is_verified")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.drop_index("ix_users_firebase_uid")
        batch_op.drop_index("ix_users_phone_number")
        batch_op.drop_column("firebase_uid")
        batch_op.drop_column("phone_number")
        batch_op.alter_column("email", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("hashed_password", existing_type=sa.Text(), nullable=False)

    op.create_table(
        "otp_codes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purpose", sa.String(length=50), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_otp_codes_user_id", "otp_codes", ["user_id"])
