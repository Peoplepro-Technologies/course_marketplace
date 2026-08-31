"""
models/lesson.py — Lesson model (individual piece of content).

Lessons belong to a section and contain text/markdown content,
plus a duration estimate in minutes. Optionally, a lesson may also
have a transcoded MP4 video stored at video_url.
"""

import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=True)  # Markdown / rich text content
    video_url = Column(String(1000), nullable=True)  # Relative URL to processed MP4
    thumbnail_url = Column(String(1000), nullable=True)  # Relative URL to video thumbnail
    order_index = Column(Integer, nullable=False, default=0)
    duration = Column(Integer, nullable=True, default=0)  # Duration in minutes
    is_preview = Column(Boolean, nullable=False, default=False, server_default="false")  # Free preview lesson

    # ── Relationships ─────────────────────────────────────────────────
    section = relationship("Section", back_populates="lessons")
    progress_records = relationship(
        "Progress",
        back_populates="lesson",
        cascade="all, delete-orphan",
    )
    transcript = relationship(
        "Transcript",
        back_populates="lesson",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Lesson {self.title}>"

