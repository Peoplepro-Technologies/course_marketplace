"""
schemas/section.py — Pydantic schemas for Section endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class SectionBase(BaseModel):
    """Shared section fields."""
    title: str
    order_index: int = 0


class SectionCreate(SectionBase):
    """Fields to create a new section."""
    pass


class SectionUpdate(BaseModel):
    """Partial update fields."""
    title: Optional[str] = None
    order_index: Optional[int] = None


class LessonInSection(BaseModel):
    """Lesson summary embedded inside a section response."""
    id: UUID
    title: str
    order_index: int
    duration: Optional[int] = 0
    content: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    class Config:
        from_attributes = True


class SectionRead(SectionBase):
    """Full section view with nested lessons."""
    id: UUID
    course_id: UUID
    lessons: List[LessonInSection] = []

    class Config:
        from_attributes = True
