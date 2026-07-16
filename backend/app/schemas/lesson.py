"""
schemas/lesson.py — Pydantic schemas for Lesson endpoints.
"""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class LessonBase(BaseModel):
    """Shared lesson fields."""
    title: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_index: int = 0
    duration: Optional[int] = 0  # minutes


class LessonCreate(LessonBase):
    """Fields to create a new lesson."""
    pass


class LessonUpdate(BaseModel):
    """Partial update fields."""
    title: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_index: Optional[int] = None
    duration: Optional[int] = None


class LessonRead(LessonBase):
    """Full lesson view."""
    id: UUID
    section_id: UUID

    class Config:
        from_attributes = True
