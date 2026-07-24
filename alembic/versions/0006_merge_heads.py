"""merge 0005_import_batch_status and 0005_remove_lactating into single head

Revision ID: 0006_merge_heads
Revises: 0005_import_batch_status, 0005_remove_lactating
Create Date: 2026-05-27

This migration merges the two parallel 0005 branches that both descended from
0004_firebase_phone_auth.  No schema changes are made here — all actual
column changes live in the parent migrations:

  0005_import_batch_status  — adds import_batches.status (VARCHAR 20)
  0005_remove_lactating     — drops health_profiles.is_lactating

Both parents must be applied before this merge can run.  On a fresh database
Alembic runs all three automatically in dependency order.  On a production
database where only 0005_import_batch_status has been applied, Alembic will
apply 0005_remove_lactating then this merge in sequence.
"""

from collections.abc import Sequence

from alembic import op  # noqa: F401 — required by Alembic even for empty migrations

revision: str = "0006_merge_heads"
down_revision: tuple[str, str] = ("0005_import_batch_status", "0005_remove_lactating")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # No schema changes — this migration only resolves the branch merge.
    pass


def downgrade() -> None:
    # Downgrade is a no-op; reverting the individual 0005 migrations handles
    # the actual schema rollback.
    pass
