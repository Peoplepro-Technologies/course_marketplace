"""add status to enrollments

Revision ID: 90317287d117
Revises: 7b1e036e0cf6
Create Date: 2026-07-27 11:29:16.796774
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '90317287d117'
down_revision: Union[str, None] = '7b1e036e0cf6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('enrollments', sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'))


def downgrade() -> None:
    op.drop_column('enrollments', 'status')
