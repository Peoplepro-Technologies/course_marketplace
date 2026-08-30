"""Add mark-as-paid fields to instructor_payouts

The instructor_payouts table was originally created (a898eb72b6dc) only for
the batch "run payouts" workflow (period_start/period_end/total_amount/status).
A second, independent "Mark as Paid" workflow (accounts.py + ACPayouts.jsx)
was built against the same table but with a different set of columns that
were never migrated. This adds those columns so both workflows share the
table without conflict.

Revision ID: e5a7c9d1f2b4
Revises: d2f4a6b8c1e3
Create Date: 2026-08-29 09:20:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a7c9d1f2b4'
down_revision: Union[str, None] = 'd2f4a6b8c1e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('instructor_payouts', sa.Column('period_label', sa.String(length=50), nullable=True))
    op.add_column('instructor_payouts', sa.Column('gross_earnings', sa.Float(), nullable=False, server_default='0'))
    op.add_column('instructor_payouts', sa.Column('platform_fee', sa.Float(), nullable=False, server_default='0'))
    op.add_column('instructor_payouts', sa.Column('net_payout', sa.Float(), nullable=False, server_default='0'))
    op.add_column('instructor_payouts', sa.Column('marked_paid_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
    op.add_column('instructor_payouts', sa.Column('marked_paid_by', sa.UUID(), nullable=True))
    op.create_foreign_key(None, 'instructor_payouts', 'users', ['marked_paid_by'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint(None, 'instructor_payouts', type_='foreignkey')
    op.drop_column('instructor_payouts', 'marked_paid_by')
    op.drop_column('instructor_payouts', 'marked_paid_at')
    op.drop_column('instructor_payouts', 'net_payout')
    op.drop_column('instructor_payouts', 'platform_fee')
    op.drop_column('instructor_payouts', 'gross_earnings')
    op.drop_column('instructor_payouts', 'period_label')
