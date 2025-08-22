# ruff: noqa: F401
"""courses.last_error + resources unique(lesson_id,url)

Revision ID: d3bcc91b9fd3
Revises: c0af4ef7f8e1
Create Date: 2025-08-14 21:41:07.380043

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d3bcc91b9fd3"
down_revision: Union[str, Sequence[str], None] = "c0af4ef7f8e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1) add column
    op.add_column("courses", sa.Column("last_error", sa.String(length=500), nullable=True))

    # 2) remove any existing duplicate resources so the unique constraint can be created cleanly
    op.execute("""
        DELETE FROM resources r
        USING resources r2
        WHERE r.lesson_id = r2.lesson_id
          AND r.url = r2.url
          AND r.id > r2.id;
    """)

    # 3) create the unique constraint (matches your models.py)
    op.create_unique_constraint("uq_resource_lesson_url", "resources", ["lesson_id", "url"])


def downgrade():
    op.drop_constraint("uq_resource_lesson_url", "resources", type_="unique")
    op.drop_column("courses", "last_error")
