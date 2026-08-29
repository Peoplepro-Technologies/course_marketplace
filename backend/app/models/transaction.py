"""
models/transaction.py — Transaction model.

Logs mock payments/transactions when a learner enrolls.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Float, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    learner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    amount = Column(Float, nullable=False, default=0.0)
    status = Column(
        String(50),
        nullable=False,
        default="completed",
    )
    payment_method = Column(
        String(50),
        nullable=False,
        default="mock",
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    refund_status = Column(
        String(50),
        nullable=False,
        default="none",
    )
    refund_reason = Column(String, nullable=True)
    included_in_payout_id = Column(
        UUID(as_uuid=True),
        ForeignKey("instructor_payouts.id", ondelete="SET NULL"),
        nullable=True,
    )
    # ── Relationships ─────────────────────────────────────────────────
    learner = relationship("User")
    course = relationship("Course")

    def __repr__(self):
        return f"<Transaction {self.id} learner={self.learner_id} course={self.course_id} amount={self.amount}>"
