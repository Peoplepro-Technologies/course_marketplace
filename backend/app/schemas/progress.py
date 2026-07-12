"""
schemas/progress.py — Pydantic schemas for Progress endpoints.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ProgressUpdate(BaseModel):
    """Sent by the learner to update lesson progress."""
    lesson_id: UUID
    status: str  # "not_started" | "in_progress" | "completed"


class ProgressRead(BaseModel):
    """Progress record returned to clients."""
    id: UUID
    learner_id: UUID
    lesson_id: UUID
    status: str
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
