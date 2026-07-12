"""
models/section.py — Section model (groups lessons within a course).

Sections are ordered within a course using order_index.
"""

import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(500), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)

    # ── Relationships ─────────────────────────────────────────────────
    course = relationship("Course", back_populates="sections")
    lessons = relationship(
        "Lesson",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="Lesson.order_index",
    )

    def __repr__(self):
        return f"<Section {self.title} (order={self.order_index})>"
