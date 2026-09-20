"""add transcripts table

Revision ID: 8bb00448a1c6
Revises: 0918c0ffcf56
Create Date: 2026-08-30 22:34:21.272876
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8bb00448a1c6'
down_revision: Union[str, None] = '0918c0ffcf56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if transcripts table already exists before creating
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'transcripts' not in tables:
        op.create_table(
            'transcripts',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('source_type', sa.String(length=50), nullable=False),
            sa.Column('lesson_id', sa.UUID(), nullable=True),
            sa.Column('live_class_id', sa.UUID(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
            sa.Column('language', sa.String(length=10), nullable=True),
            sa.Column('full_text', sa.Text(), nullable=True),
            sa.Column('segments', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('whisper_model', sa.String(length=50), nullable=False, server_default='base'),
            sa.Column('duration_seconds', sa.Float(), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint(
                '((lesson_id IS NOT NULL AND live_class_id IS NULL) OR (lesson_id IS NULL AND live_class_id IS NOT NULL))',
                name='chk_transcript_target'
            ),
            sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['live_class_id'], ['live_classes.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_transcripts_lesson_id'), 'transcripts', ['lesson_id'], unique=False)
        op.create_index(op.f('ix_transcripts_live_class_id'), 'transcripts', ['live_class_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_transcripts_live_class_id'), table_name='transcripts')
    op.drop_index(op.f('ix_transcripts_lesson_id'), table_name='transcripts')
    op.drop_table('transcripts')
