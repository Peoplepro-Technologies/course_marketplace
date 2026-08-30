"""merge heads

Revision ID: 9b60958c6eff
Revises: a8e9a17f0198, ac273dd96454
Create Date: 2026-08-14 09:21:38.998279
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b60958c6eff'
down_revision: Union[str, None] = ('a8e9a17f0198', 'ac273dd96454')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
