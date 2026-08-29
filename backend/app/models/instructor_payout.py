"""
models/instructor_payout.py — InstructorPayout model.

Two payout workflows share this table:

1. "Mark as Paid" (accounts role, ACPayouts.jsx): a manual snapshot of an
   instructor's estimated earnings (gross_earnings, platform_fee, net_payout,
   period_label, marked_paid_at, marked_paid_by). No linked transactions.

2. "Run Payouts" (accounts role batch job + instructor earnings page): bundles
   a set of Transactions into a payout for a period (period_start, period_end,
   total_amount, status, released_at), linked back via
   Transaction.included_in_payout_id.

NOTE: Earnings are estimated / no real payment gateway is connected.
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

    # ── "Mark as Paid" snapshot fields ───────────────────────────────────
    period_label = Column(String(50), nullable=True)  # e.g. "Aug 2026"
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

    # ── "Run Payouts" batch fields ────────────────────────────────────────
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    total_amount = Column(Float, nullable=False, default=0.0)
    status = Column(
        String(50),
        nullable=False,
        default="pending",  # "pending", "released", "settled"
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    released_at = Column(DateTime(timezone=True), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────
    instructor = relationship("User", foreign_keys=[instructor_id])
    payer = relationship("User", foreign_keys=[marked_paid_by])

    def __repr__(self):
        return f"<InstructorPayout instructor={self.instructor_id} net={self.net_payout}>"
