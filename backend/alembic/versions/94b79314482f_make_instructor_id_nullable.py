"""make instructor_id nullable

Revision ID: 94b79314482f
Revises: 82f9256ce371
Create Date: 2026-10-02 20:02:16.337375
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '94b79314482f'
down_revision: Union[str, None] = '82f9256ce371'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('courses', 'instructor_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('courses', 'instructor_id',
               existing_type=sa.UUID(),
               nullable=False)
