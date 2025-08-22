# ruff: noqa: F401
"""merge heads: status + last_error

Revision ID: 20a822dbb919
Revises: d3bcc91b9fd3, 906c453f1238
Create Date: 2025-08-14 22:12:28.304612

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20a822dbb919"
down_revision: Union[str, Sequence[str], None] = ("d3bcc91b9fd3", "906c453f1238")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
