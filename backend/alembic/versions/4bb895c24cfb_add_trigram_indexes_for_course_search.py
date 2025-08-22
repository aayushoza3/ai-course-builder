"""add trigram indexes for course search

Revision ID: 4bb895c24cfb
Revises: 9e082ebce0ea
Create Date: 2025-08-14 23:00:18.873585

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4bb895c24cfb'
down_revision: Union[str, Sequence[str], None] = '9e082ebce0ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        # Enable extension once (safe if already enabled)
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        # Required to build GIN indexes concurrently
        op.execute("COMMIT")
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_courses_title_trgm "
            "ON courses USING gin (title gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_courses_description_trgm "
            "ON courses USING gin ((COALESCE(description, '')) gin_trgm_ops)"
        )
    else:
        # Non-Postgres: skip (search still works, just slower)
        pass

def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute("COMMIT")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_courses_title_trgm")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_courses_description_trgm")
    else:
        pass