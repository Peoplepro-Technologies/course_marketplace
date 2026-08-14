"""
models/enrollment.py — Enrollment model (learner ↔ course link).

Each enrollment represents a learner signing up for a course.
A unique constraint prevents duplicate enrollments.

Enrollment status workflow:
  pending  → learner has requested enrollment, awaiting admin approval
  approved → admin has approved access (learner can view lesson videos)
  rejected → admin has rejected the request
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("learner_id", "course_id", name="uq_enrollment"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    learner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    enrolled_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    status = Column(
        String(50),
        default="pending",
        nullable=False,
    )
    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )
    approved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    payout_status = Column(
        String(20),
        nullable=False,
        default="pending",
    )

    # ── Relationships ─────────────────────────────────────────────────
    learner = relationship(
        "User",
        back_populates="enrollments",
        foreign_keys=[learner_id],
    )
    course = relationship("Course", back_populates="enrollments")

    def __repr__(self):
        return f"<Enrollment user={self.learner_id} course={self.course_id}>"
