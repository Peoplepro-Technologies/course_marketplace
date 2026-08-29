"""
models/instructor_payout.py — InstructorPayout model.

Records a payout event for an instructor.
Each "Mark as Paid" action by the accounts role creates one row.

NOTE: Earnings are estimated (sum of course prices × approved enrollments
      minus a flat 20% platform fee). No real payment is processed.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class InstructorPayout(Base):
    __tablename__ = "instructor_payouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_label = Column(String(50), nullable=False)  # e.g. "Aug 2026"
    gross_earnings = Column(Float, nullable=False, default=0.0)
    platform_fee = Column(Float, nullable=False, default=0.0)   # 20% of gross
    net_payout = Column(Float, nullable=False, default=0.0)     # gross - fee
    marked_paid_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    marked_paid_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ──────────────────────────────────────────────────
    instructor = relationship("User", foreign_keys=[instructor_id])
    payer = relationship("User", foreign_keys=[marked_paid_by])

    def __repr__(self):
        return f"<InstructorPayout instructor={self.instructor_id} net={self.net_payout}>"
