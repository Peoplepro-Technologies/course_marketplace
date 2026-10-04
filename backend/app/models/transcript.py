"""
models/transcript.py — Transcript model for video and lecture transcriptions.

Stores full text and timestamped segments for:
  - Uploaded lesson videos (lesson_id)
  - Live class sessions (live_class_id)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type = Column(String(50), nullable=False)  # "lesson" | "live_class"

    lesson_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    live_class_id = Column(
        UUID(as_uuid=True),
        ForeignKey("live_classes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="pending",  # "pending" | "processing" | "completed" | "failed"
    )
    language = Column(String(10), nullable=True)
    full_text = Column(Text, nullable=True)
    segments = Column(JSONB, nullable=True)
    whisper_model = Column(String(50), nullable=False, default="base")
    duration_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Constraints ───────────────────────────────────────────────────
    __table_args__ = (
        CheckConstraint(
            "((lesson_id IS NOT NULL AND live_class_id IS NULL) OR (lesson_id IS NULL AND live_class_id IS NOT NULL))",
            name="chk_transcript_target",
        ),
    )

    # ── Relationships ─────────────────────────────────────────────────
    lesson = relationship("Lesson", back_populates="transcript")
    live_class = relationship("LiveClass", back_populates="transcript")

    def __repr__(self):
        target = f"lesson_id={self.lesson_id}" if self.lesson_id else f"live_class_id={self.live_class_id}"
        return f"<Transcript {self.id} [{self.source_type}] {target} status={self.status}>"
