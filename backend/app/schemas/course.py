"""
schemas/course.py — Pydantic schemas for Course endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class CourseBase(BaseModel):
    """Shared course fields."""
    title: str
    description: Optional[str] = None
    category: str = "General"
    thumbnail_url: Optional[str] = None
    price: float = 0.0


class CourseCreate(CourseBase):
    """Fields required to create a new course."""
    pass


class CourseUpdate(BaseModel):
    """All fields optional for partial updates."""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    price: Optional[float] = None


class InstructorInfo(BaseModel):
    """Lightweight instructor data embedded in course responses."""
    id: UUID
    name: str
    profile_pic: Optional[str] = None

    class Config:
        from_attributes = True


class CourseRead(CourseBase):
    """Full course view returned to clients."""
    id: UUID
    instructor_id: UUID
    status: str
    rejection_reason: Optional[str] = None
    avg_rating: Optional[float] = 0.0
    created_at: datetime
    instructor: Optional[InstructorInfo] = None

    class Config:
        from_attributes = True


class CourseListRead(BaseModel):
    """Paginated course list response."""
    courses: List[CourseRead]
    total: int
    page: int
    page_size: int


class CourseModerateAction(BaseModel):
    """Admin action to moderate a course."""
    action: str  # "approve" | "flag" | "remove" | "reject"
    rejection_reason: Optional[str] = None
