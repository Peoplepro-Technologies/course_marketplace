"""
schemas/refund_request.py — Pydantic schemas for RefundRequest endpoints.
"""

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class RefundRequestCreate(BaseModel):
    """Submitted by a learner to request a refund."""
    enrollment_id: UUID
    reason: str


class RefundRequestRead(BaseModel):
    """Refund request record returned to clients."""
    id: UUID
    enrollment_id: UUID
    learner_id: UUID
    reason: str
    status: str
    requested_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None

    # Denormalised fields populated by the router
    learner_name: Optional[str] = None
    course_title: Optional[str] = None
    course_price: Optional[float] = None

    class Config:
        from_attributes = True


class RefundRequestResolve(BaseModel):
    """Body for approve/reject endpoints (optional note, future-proofing)."""
    note: Optional[str] = None
