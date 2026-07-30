"""
schemas/review.py — Pydantic schemas for Review endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ReviewCreate(BaseModel):
    """Submitted by a learner to review an enrolled course."""
    course_id: UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewRead(BaseModel):
    """Review returned to clients."""
    id: UUID
    learner_id: UUID
    course_id: UUID
    rating: int
    comment: Optional[str] = None
    status: str
    created_at: datetime
    learner_name: Optional[str] = None
    course_title: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewModerateAction(BaseModel):
    """Admin action to moderate a review."""
    action: str  # "flag" | "remove" | "approve"
