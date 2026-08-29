"""add_categories_table

Revision ID: ac273dd96454
Revises: b2c3d4e5f6a7
Create Date: 2026-07-29 18:25:41.208084
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac273dd96454'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'categories' not in tables:
        op.create_table('categories',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
        )

        # Ensure uuid function exists
        op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

        # Data Migration: Seed categories from existing courses
        # Use DISTINCT ON to avoid case-insensitive duplicates (e.g., 'Tech' vs 'tech')
        # Skip NULLs or empty strings
        op.execute("""
            INSERT INTO categories (id, name, created_at)
            SELECT DISTINCT ON (lower(trim(category)))
                gen_random_uuid(), 
                trim(category), 
                now()
            FROM courses 
            WHERE category IS NOT NULL AND trim(category) != '';
        """)



def downgrade() -> None:
    op.drop_table('categories')
