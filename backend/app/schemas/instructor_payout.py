"""
schemas/instructor_payout.py — Pydantic schemas for InstructorPayout endpoints.
"""

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class InstructorPayoutRead(BaseModel):
    """Payout record returned to clients."""
    id: UUID
    instructor_id: UUID
    period_label: str
    gross_earnings: float
    platform_fee: float
    net_payout: float
    marked_paid_at: datetime
    marked_paid_by: Optional[UUID] = None

    class Config:
        from_attributes = True
