"""Add AssignmentSubmission and QuizAttempt

Revision ID: 9cef12763d11
Revises: 94b79314482f
Create Date: 2026-10-03 07:02:32.410630
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9cef12763d11'
down_revision: Union[str, None] = '94b79314482f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('assignment_submissions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('assignment_id', sa.UUID(), nullable=False),
    sa.Column('learner_id', sa.UUID(), nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['learner_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('quiz_attempts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('quiz_question_id', sa.UUID(), nullable=False),
    sa.Column('learner_id', sa.UUID(), nullable=False),
    sa.Column('selected_option_index', sa.Integer(), nullable=False),
    sa.Column('is_correct', sa.Boolean(), nullable=False),
    sa.Column('attempted_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['learner_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['quiz_question_id'], ['quiz_questions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('quiz_attempts')
    op.drop_table('assignment_submissions')
