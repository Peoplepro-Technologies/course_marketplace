"""
schemas/live_class.py — Pydantic schemas for Live Class endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class LiveClassCreate(BaseModel):
    """Payload to schedule a new live class."""
    title: str = Field(..., min_length=3, max_length=255)
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=5, le=480)


class LiveClassRead(BaseModel):
    """Live class data returned to clients."""
    id: UUID
    course_id: UUID
    instructor_id: UUID
    title: str
    scheduled_at: datetime
    duration_minutes: int
    room_name: str
    status: str
    created_at: datetime
    # optional extras the routers may attach
    course_title: Optional[str] = None

    class Config:
        from_attributes = True


class JoinInfoRead(BaseModel):
    """Minimal info needed to join a Jitsi room."""
    id: UUID
    room_name: str
    title: str
    scheduled_at: datetime
    duration_minutes: int
    status: str
