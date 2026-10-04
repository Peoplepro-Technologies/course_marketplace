"""Merge heads

Revision ID: 7e38c5dab690
Revises: 553b8c3dfb48, 9e0e00774224, b6212267563c, b785c9781006
Create Date: 2026-10-01 16:38:47.457981
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e38c5dab690'
down_revision: Union[str, None] = ('553b8c3dfb48', '9e0e00774224', 'b6212267563c', 'b785c9781006')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
