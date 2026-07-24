"""initial backend schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.Text(), nullable=False),
        sa.Column("full_name", sa.String(length=255)),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "otp_codes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purpose", sa.String(length=50), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_otp_codes_user_id", "otp_codes", ["user_id"])

    op.create_table(
        "revoked_tokens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("jti", sa.String(length=64), nullable=False),
        sa.Column("token_type", sa.String(length=20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("jti", name="uq_revoked_tokens_jti"),
    )

    op.create_table(
        "import_batches",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("source_name", sa.String(length=120), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("filename", sa.String(length=255)),
        sa.Column("records_total", sa.Integer(), nullable=False),
        sa.Column("records_imported", sa.Integer(), nullable=False),
        sa.Column("errors", sa.Text()),
        sa.Column("created_by_user_id", sa.String(length=36)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "medicines",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("generic_name", sa.String(length=255), nullable=False),
        sa.Column("brand_name", sa.String(length=255)),
        sa.Column("composition", sa.Text()),
        sa.Column("dosage_form", sa.String(length=120)),
        sa.Column("strength", sa.String(length=120)),
        sa.Column("side_effects", sa.Text()),
        sa.Column("precautions", sa.Text()),
        sa.Column("contraindications", sa.Text()),
        sa.Column("storage_instructions", sa.Text()),
        sa.Column("usage_guidelines", sa.Text()),
        sa.Column("source_name", sa.String(length=120), nullable=False),
        sa.Column("source_url", sa.Text()),
        sa.Column("source_version", sa.String(length=120)),
        sa.Column("source_date", sa.String(length=60)),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("rx_cui", sa.String(length=80)),
        sa.Column("import_batch_id", sa.String(length=36), sa.ForeignKey("import_batches.id")),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_medicines_generic_name", "medicines", ["generic_name"])
    op.create_index("ix_medicines_brand_name", "medicines", ["brand_name"])
    op.create_index("ix_medicines_rx_cui", "medicines", ["rx_cui"])
    op.create_index("ix_medicines_generic_brand", "medicines", ["generic_name", "brand_name"])
    op.create_index("ix_medicines_composition", "medicines", ["composition"])

    op.create_table(
        "medicine_aliases",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("medicine_id", sa.String(length=36), sa.ForeignKey("medicines.id", ondelete="CASCADE")),
        sa.Column("alias", sa.String(length=255), nullable=False),
        sa.Column("alias_type", sa.String(length=50), nullable=False),
        sa.Column("source_name", sa.String(length=120), nullable=False),
    )
    op.create_index("ix_medicine_aliases_alias", "medicine_aliases", ["alias"])

    op.create_table(
        "drug_interactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("drug_a_key", sa.String(length=255), nullable=False),
        sa.Column("drug_b_key", sa.String(length=255), nullable=False),
        sa.Column("drug_a_name", sa.String(length=255), nullable=False),
        sa.Column("drug_b_name", sa.String(length=255), nullable=False),
        sa.Column("severity", sa.String(length=30), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("mechanism", sa.Text()),
        sa.Column("recommendations", sa.Text()),
        sa.Column("source_name", sa.String(length=120), nullable=False),
        sa.Column("source_url", sa.Text()),
        sa.Column("source_version", sa.String(length=120)),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_interaction_pair", "drug_interactions", ["drug_a_key", "drug_b_key"], unique=True)
    op.create_index("ix_interaction_severity", "drug_interactions", ["severity"])

    op.create_table(
        "health_profiles",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("age", sa.Integer()),
        sa.Column("gender", sa.String(length=50)),
        sa.Column("weight_kg", sa.Float()),
        sa.Column("allergies", sa.Text()),
        sa.Column("medical_conditions", sa.Text()),
        sa.Column("current_medications", sa.Text()),
        sa.Column("is_pregnant", sa.Boolean()),
        sa.Column("is_lactating", sa.Boolean()),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_health_profiles_user_id", "health_profiles", ["user_id"], unique=True)

    op.create_table(
        "symptom_rules",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("symptom_keywords", sa.Text(), nullable=False),
        sa.Column("possible_condition", sa.String(length=255), nullable=False),
        sa.Column("care_recommendations", sa.Text(), nullable=False),
        sa.Column("common_medicines", sa.Text()),
        sa.Column("precautions", sa.Text()),
        sa.Column("escalation_triggers", sa.Text()),
        sa.Column("is_emergency", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("actor_user_id", sa.String(length=36)),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=120)),
        sa.Column("entity_id", sa.String(length=120)),
        sa.Column("details", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_table("symptom_rules")
    op.drop_index("ix_health_profiles_user_id", table_name="health_profiles")
    op.drop_table("health_profiles")
    op.drop_index("ix_interaction_severity", table_name="drug_interactions")
    op.drop_index("ix_interaction_pair", table_name="drug_interactions")
    op.drop_table("drug_interactions")
    op.drop_index("ix_medicine_aliases_alias", table_name="medicine_aliases")
    op.drop_table("medicine_aliases")
    op.drop_index("ix_medicines_composition", table_name="medicines")
    op.drop_index("ix_medicines_generic_brand", table_name="medicines")
    op.drop_index("ix_medicines_rx_cui", table_name="medicines")
    op.drop_index("ix_medicines_brand_name", table_name="medicines")
    op.drop_index("ix_medicines_generic_name", table_name="medicines")
    op.drop_table("medicines")
    op.drop_table("import_batches")
    op.drop_table("revoked_tokens")
    op.drop_index("ix_otp_codes_user_id", table_name="otp_codes")
    op.drop_table("otp_codes")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
