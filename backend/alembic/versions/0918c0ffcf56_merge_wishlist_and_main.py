"""merge_wishlist_and_main

Revision ID: 0918c0ffcf56
Revises: 608b239bd38a, f1e2d3c4b5a6
Create Date: 2026-08-29 18:37:30.278004
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0918c0ffcf56'
down_revision: Union[str, None] = ('608b239bd38a', 'f1e2d3c4b5a6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
