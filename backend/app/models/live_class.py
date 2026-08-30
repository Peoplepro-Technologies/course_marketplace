"""
models/live_class.py — LiveClass model.

Represents a scheduled/live/ended live video class for a course.
Instructors create these and students with approved enrollments can join.

Status workflow:
  scheduled → instructor has created the session, it has not started yet
  live      → instructor has clicked "Start", session is active
  ended     → instructor has clicked "End", session is over
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class LiveClass(Base):
    __tablename__ = "live_classes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    room_name = Column(String(255), nullable=False, unique=True)
    status = Column(
        String(50),
        nullable=False,
        default="scheduled",  # scheduled | live | ended
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────
    course = relationship("Course", back_populates="live_classes")
    instructor = relationship("User", back_populates="live_classes")

    def __repr__(self):
        return f"<LiveClass {self.title!r} status={self.status}>"
