"""merge_preview_and_payout_heads

Revision ID: 9ce22ea4f112
Revises: a898eb72b6dc
Create Date: 2026-08-29 09:46:53.510572
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ce22ea4f112'
down_revision: Union[str, None] = ('a898eb72b6dc', '30960ccd623d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
