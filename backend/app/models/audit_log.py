"""
models/audit_log.py — Audit log for tracking administrative actions.

Logs events such as:
  - Role changes (user role updated by super admin)
  - Course status overrides (publish, unpublish, remove)
  - Enrollment approvals/rejections
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action = Column(String(100), nullable=False)       # e.g. "role_change", "course_status_override"
    target_type = Column(String(50), nullable=False)    # e.g. "user", "course", "enrollment"
    target_id = Column(String(255), nullable=False)     # UUID stored as string for flexibility
    details = Column(Text, nullable=True)               # Human-readable description
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────────────
    actor = relationship("User", foreign_keys=[actor_user_id])

    def __repr__(self):
        return f"<AuditLog {self.action} by={self.actor_user_id} target={self.target_type}:{self.target_id}>"
