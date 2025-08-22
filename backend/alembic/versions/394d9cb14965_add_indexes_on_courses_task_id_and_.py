"""add indexes on courses.task_id and created_at

Revision ID: 394d9cb14965
Revises: 20a822dbb919
Create Date: 2025-08-14 22:15:54.109934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '394d9cb14965'
down_revision: Union[str, Sequence[str], None] = '20a822dbb919'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute("COMMIT")
        op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_courses_task_id ON courses (task_id)")
        op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_courses_created_at ON courses (created_at)")
    else:
        try:
            op.create_index("ix_courses_task_id", "courses", ["task_id"], unique=False, if_not_exists=True)
        except TypeError:
            op.create_index("ix_courses_task_id", "courses", ["task_id"], unique=False)

        try:
            op.create_index("ix_courses_created_at", "courses", ["created_at"], unique=False, if_not_exists=True)
        except TypeError:
            op.create_index("ix_courses_created_at", "courses", ["created_at"], unique=False)

def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute("COMMIT")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_courses_task_id")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_courses_created_at")
    else:
        try:
            op.drop_index("ix_courses_task_id", table_name="courses")
        except Exception:
            pass
        try:
            op.drop_index("ix_courses_created_at", table_name="courses")
        except Exception:
            pass