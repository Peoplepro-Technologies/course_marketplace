"""add approved_at and approved_by to enrollments

Revision ID: a8e9a17f0198
Revises: 90317287d117
Create Date: 2026-07-27 11:55:25.554443
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8e9a17f0198'
down_revision: Union[str, None] = '90317287d117'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('enrollments', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('enrollments', sa.Column('approved_by', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_enrollments_approved_by_users',
        'enrollments', 'users',
        ['approved_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_enrollments_approved_by_users', 'enrollments', type_='foreignkey')
    op.drop_column('enrollments', 'approved_by')
    op.drop_column('enrollments', 'approved_at')
