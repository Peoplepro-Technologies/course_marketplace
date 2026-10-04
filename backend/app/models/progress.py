"""
models/progress.py — Progress model (tracks lesson completion per learner).

Status transitions: not_started → in_progress → completed
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (
        UniqueConstraint("learner_id", "lesson_id", name="uq_progress"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    learner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    lesson_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(
        String(20),
        nullable=False,
        default="not_started",  # not_started | in_progress | completed
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────
    learner = relationship("User", back_populates="progress_records")
    lesson = relationship("Lesson", back_populates="progress_records")

    def __repr__(self):
        return f"<Progress lesson={self.lesson_id} status={self.status}>"
