"""add course.status

Revision ID: 906c453f1238
Revises: c0af4ef7f8e1
Create Date: 2025-08-07 17:32:08.598213

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '906c453f1238'
down_revision: Union[str, Sequence[str], None] = 'c0af4ef7f8e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("courses")}

    if "status" not in cols:
        # fresh add
        op.add_column(
            "courses",
            sa.Column("status", sa.String(length=32), server_default="queued", nullable=False),
        )
    else:
        # already there -> ensure default + not-null
        op.execute("ALTER TABLE courses ALTER COLUMN status SET DEFAULT 'queued'")
        op.execute("UPDATE courses SET status = 'queued' WHERE status IS NULL")
        op.execute("ALTER TABLE courses ALTER COLUMN status SET NOT NULL")

def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("courses")}
    if "status" in cols:
        op.drop_column("courses", "status")
