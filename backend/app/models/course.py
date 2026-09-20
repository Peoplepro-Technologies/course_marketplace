"""
models/course.py — Course model.

Courses are created by instructors and go through a lifecycle:
  draft → published → (optionally flagged/removed by admin)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, default="General")
    thumbnail_url = Column(Text, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    status = Column(
        String(20),
        nullable=False,
        default="draft",  # draft | pending_review | published | rejected | flagged | removed
    )
    rejection_reason = Column(Text, nullable=True)
    avg_rating = Column(Float, nullable=True, default=0.0)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    learning_outcomes = Column(JSONB, nullable=True, default=list)
    skills = Column(JSONB, nullable=True, default=list)

    # ── Relationships ─────────────────────────────────────────────────
    instructor = relationship("User", back_populates="courses")
    sections = relationship(
        "Section",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="Section.order_index",
    )
    enrollments = relationship(
        "Enrollment",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    reviews = relationship(
        "Review",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    live_classes = relationship(
        "LiveClass",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="LiveClass.scheduled_at",
    )

    def __repr__(self):
        return f"<Course {self.title} [{self.status}]>"
