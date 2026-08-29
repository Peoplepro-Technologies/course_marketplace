"""
models/payout.py — InstructorPayout model.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Float, String, DateTime, ForeignKey
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

    instructor = relationship("User")

    def __repr__(self):
        return f"<InstructorPayout {self.id} instructor={self.instructor_id} amount={self.total_amount}>"
