"""
schemas/enrollment.py — Pydantic schemas for Enrollment endpoints.
"""

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class EnrollmentRead(BaseModel):
    """Enrollment record returned to clients."""
    id: UUID
    learner_id: UUID
    course_id: UUID
    enrolled_at: datetime
    course_title: Optional[str] = None
    progress_percent: Optional[float] = 0.0

    class Config:
        from_attributes = True
