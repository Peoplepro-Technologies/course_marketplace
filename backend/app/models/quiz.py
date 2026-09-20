"""
models/quiz.py — QuizQuestion model for interactive learning.

Belongs to a Lesson. Contains multiple-choice options.
"""

import uuid
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_text = Column(Text, nullable=False)
    options = Column(JSONB, nullable=False) # List of strings
    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=True)

    # Relationships
    lesson = relationship("Lesson", back_populates="quiz_questions")

    def __repr__(self):
        return f"<QuizQuestion {self.id}>"
