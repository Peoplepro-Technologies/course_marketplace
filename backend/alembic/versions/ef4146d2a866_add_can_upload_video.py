"""add_can_upload_video

Revision ID: ef4146d2a866
Revises: 9cef12763d11
Create Date: 2026-10-03 09:14:25.065008
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef4146d2a866'
down_revision: Union[str, None] = '9cef12763d11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('can_upload_video', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'can_upload_video')
