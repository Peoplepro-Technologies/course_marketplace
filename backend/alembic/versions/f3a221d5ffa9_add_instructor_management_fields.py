"""Add instructor management fields: previous_instructor_id on courses,
instructor_payout_rate on users, can_host_live_classes on users.

Revision ID: f3a221d5ffa9
Revises: 41b4a96bcf02
Create Date: 2026-10-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f3a221d5ffa9'
down_revision: Union[str, None] = '41b4a96bcf02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Group 2: track previous instructor for reassignment transparency
    op.add_column('courses',
        sa.Column('previous_instructor_id',
                  sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'),
                  nullable=True))

    # Group 3: per-instructor custom payout rate (nullable = falls back to platform default)
    op.add_column('users',
        sa.Column('instructor_payout_rate', sa.Float(), nullable=True))

    # Group 5: faculty flag (can_host_live_classes, default True for all existing instructors)
    op.add_column('users',
        sa.Column('can_host_live_classes', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'can_host_live_classes')
    op.drop_column('users', 'instructor_payout_rate')
    op.drop_column('courses', 'previous_instructor_id')
