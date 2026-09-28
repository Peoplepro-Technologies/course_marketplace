"""
models/assignment.py — Assignment model for practical tasks.

Belongs to a Lesson.
"""

import uuid
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(500), nullable=False)
    instructions = Column(Text, nullable=False)

    # Relationships
    lesson = relationship("Lesson", back_populates="assignments")

    def __repr__(self):
        return f"<Assignment {self.title}>"
