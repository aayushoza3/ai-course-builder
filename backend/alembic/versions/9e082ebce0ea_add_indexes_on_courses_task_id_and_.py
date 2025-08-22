# ruff: noqa: F401
"""add indexes on courses.task_id and created_at

Revision ID: 9e082ebce0ea
Revises: 394d9cb14965
Create Date: 2025-08-14 22:49:22.204825

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9e082ebce0ea"
down_revision: Union[str, Sequence[str], None] = "394d9cb14965"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Normalize any NULLs before enforcing
    op.execute("UPDATE courses SET status='queued' WHERE status IS NULL")

    # Create CHECK constraint if it doesn't already exist (Postgres-safe)
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'courses' AND c.conname = 'ck_courses_status_valid'
      ) THEN
        ALTER TABLE courses
        ADD CONSTRAINT ck_courses_status_valid
        CHECK (status IN ('queued','generating','ready','failed','canceled'));
      END IF;
    END$$;
    """)


def downgrade():
    # Drop if exists
    op.execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'courses' AND c.conname = 'ck_courses_status_valid'
      ) THEN
        ALTER TABLE courses DROP CONSTRAINT ck_courses_status_valid;
      END IF;
    END$$;
    """)
