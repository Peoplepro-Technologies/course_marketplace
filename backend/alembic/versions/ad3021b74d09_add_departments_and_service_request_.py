"""add_departments_and_service_request_system

Revision ID: ad3021b74d09
Revises: ef4146d2a866
Create Date: 2026-10-04 18:01:19.221791

Manual migration — departments table already exists, so we only add
missing columns and drop the old branches FK columns.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ad3021b74d09'
down_revision: Union[str, None] = 'ef4146d2a866'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Drop old FK constraints on branches (safe even if already gone) ──
    for constraint, table in [
        ('support_tickets_branch_id_fkey', 'support_tickets'),
        ('ticket_routing_rules_branch_id_fkey', 'ticket_routing_rules'),
        ('users_branch_id_fkey', 'users'),
    ]:
        try:
            op.drop_constraint(constraint, table, type_='foreignkey')
        except Exception:
            pass  # already gone

    # ── 2. Drop branches table (CASCADE handles any remaining deps) ──
    conn.execute(sa.text('DROP TABLE IF EXISTS branches CASCADE'))

    # ── 3. support_tickets: add missing columns ──
    existing_st = [row[0] for row in conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='support_tickets'"
    ))]
    if 'sr_sequence' not in existing_st:
        op.add_column('support_tickets', sa.Column('sr_sequence', sa.Integer(), nullable=True))
    if 'subcategory' not in existing_st:
        op.add_column('support_tickets', sa.Column('subcategory', sa.String(length=100), nullable=True))
    if 'department_id' not in existing_st:
        op.add_column('support_tickets', sa.Column('department_id', sa.UUID(), nullable=True))
        op.create_foreign_key(
            'support_tickets_department_id_fkey', 'support_tickets', 'departments',
            ['department_id'], ['id'], ondelete='SET NULL'
        )
    # Widen category column
    op.alter_column('support_tickets', 'category',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.String(length=100),
               existing_nullable=False)
    # Make assigned_team nullable
    op.alter_column('support_tickets', 'assigned_team',
               existing_type=sa.VARCHAR(length=50),
               nullable=True)
    # Drop branch_id
    if 'branch_id' in existing_st:
        op.drop_column('support_tickets', 'branch_id')

    # ── 4. ticket_routing_rules: add missing columns ──
    existing_trr = [row[0] for row in conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='ticket_routing_rules'"
    ))]
    if 'role_context' not in existing_trr:
        op.add_column('ticket_routing_rules', sa.Column('role_context', sa.String(length=50), nullable=True))
        op.create_index('ix_ticket_routing_rules_role_context', 'ticket_routing_rules', ['role_context'])
    if 'subcategory' not in existing_trr:
        op.add_column('ticket_routing_rules', sa.Column('subcategory', sa.String(length=100), nullable=True))
        op.create_index('ix_ticket_routing_rules_subcategory', 'ticket_routing_rules', ['subcategory'])
    if 'department_id' not in existing_trr:
        op.add_column('ticket_routing_rules', sa.Column('department_id', sa.UUID(), nullable=True))
        op.create_foreign_key(
            'ticket_routing_rules_department_id_fkey', 'ticket_routing_rules', 'departments',
            ['department_id'], ['id'], ondelete='SET NULL'
        )
    # Make assigned_role nullable
    op.alter_column('ticket_routing_rules', 'assigned_role',
               existing_type=sa.VARCHAR(length=50),
               nullable=True)
    # Drop old unique constraint
    try:
        op.drop_constraint('uq_ticket_routing_rule_category_branch', 'ticket_routing_rules', type_='unique')
    except Exception:
        pass
    if 'branch_id' in existing_trr:
        op.drop_column('ticket_routing_rules', 'branch_id')

    # ── 5. users: add department_id ──
    existing_users = [row[0] for row in conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='users'"
    ))]
    if 'department_id' not in existing_users:
        op.add_column('users', sa.Column('department_id', sa.UUID(), nullable=True))
        op.create_foreign_key(
            'users_department_id_fkey', 'users', 'departments',
            ['department_id'], ['id'], ondelete='SET NULL'
        )
    if 'branch_id' in existing_users:
        op.drop_column('users', 'branch_id')


def downgrade() -> None:
    # Remove department columns (branch columns are gone — not restoring)
    op.drop_column('users', 'department_id')
    op.drop_column('ticket_routing_rules', 'department_id')
    op.drop_column('ticket_routing_rules', 'subcategory')
    op.drop_column('ticket_routing_rules', 'role_context')
    op.drop_column('support_tickets', 'department_id')
    op.drop_column('support_tickets', 'subcategory')
    op.drop_column('support_tickets', 'sr_sequence')
    op.drop_table('departments')
