"""
schemas/transcript.py — Pydantic schemas for Transcript endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID


class TranscriptSegment(BaseModel):
    """Timestamped segment/cue from Whisper."""
    start: float
    end: float
    text: str


class TranscriptBase(BaseModel):
    source_type: str
    lesson_id: Optional[UUID] = None
    live_class_id: Optional[UUID] = None
    whisper_model: str = "base"


class TranscriptCreate(TranscriptBase):
    pass


class TranscriptRead(TranscriptBase):
    id: UUID
    status: str
    language: Optional[str] = None
    full_text: Optional[str] = None
    segments: Optional[List[Any]] = None
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
