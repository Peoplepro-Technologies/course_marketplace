"""
models/review.py — Review model (course ratings and comments).

Reviews can be moderated by admins (flagged or removed).
Each learner can only leave one review per course.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("learner_id", "course_id", name="uq_review"),
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
    rating = Column(Integer, nullable=False)  # 1–5 stars
    comment = Column(Text, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default="active",  # active | flagged | removed
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────
    learner = relationship("User", back_populates="reviews")
    course = relationship("Course", back_populates="reviews")

    def __repr__(self):
        return f"<Review course={self.course_id} rating={self.rating}>"
