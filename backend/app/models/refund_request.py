"""
models/refund_request.py — RefundRequest model.

Tracks learner-initiated refund requests for approved enrollments.

Status workflow:
  pending  → learner has submitted request, awaiting accounts review
  approved → accounts has approved; enrollment is set to "refunded"
  rejected → accounts has rejected the refund request
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class RefundRequest(Base):
    __tablename__ = "refund_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
    )
    learner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    reason = Column(Text, nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default="pending",  # pending | approved | rejected
    )
    requested_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ──────────────────────────────────────────────────
    enrollment = relationship("Enrollment", foreign_keys=[enrollment_id])
    learner = relationship("User", foreign_keys=[learner_id])
    resolver = relationship("User", foreign_keys=[resolved_by])

    def __repr__(self):
        return f"<RefundRequest enrollment={self.enrollment_id} status={self.status}>"
