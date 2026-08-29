"""merge heads

Revision ID: edd14ffd6ab9
Revises: 4ee051043ec8, 56c4fb1d4a80
Create Date: 2026-08-29 14:31:59.704173
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'edd14ffd6ab9'
down_revision: Union[str, None] = ('4ee051043ec8', '56c4fb1d4a80')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
