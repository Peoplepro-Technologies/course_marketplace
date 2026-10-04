"""Add video_url and thumbnail_url to lessons

Revision ID: a1b2c3d4e5f6
Revises: 953363d0a3f2
Create Date: 2026-07-13 09:08:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '953363d0a3f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('lessons', sa.Column('video_url', sa.String(length=1000), nullable=True))
    op.add_column('lessons', sa.Column('thumbnail_url', sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column('lessons', 'thumbnail_url')
    op.drop_column('lessons', 'video_url')
