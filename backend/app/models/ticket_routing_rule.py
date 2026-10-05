"""
models/ticket_routing_rule.py — Database-driven ticket routing rules (v2).

Two-level hierarchy: Role → Category → Sub-category → Department.
Each rule maps (role_context, category, subcategory) to a Department.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TicketRoutingRule(Base):
    __tablename__ = "ticket_routing_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The role this rule applies to: "learner", "instructor", "coursecoordinator"
    role_context = Column(String(50), nullable=False, index=True)
    # First-level category (e.g. "Payment & Refund")
    category = Column(String(100), nullable=False, index=True)
    # Second-level sub-category / service request (e.g. "Refund request")
    subcategory = Column(String(100), nullable=False, index=True)

    # Department FK — the department that owns this queue
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    # Legacy field kept for backwards-compat (not used for routing anymore)
    assigned_role = Column(String(50), nullable=True)
    assignee_name = Column(String(255), nullable=True)
    assignee_email = Column(String(255), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    department = relationship("Department", back_populates="routing_rules")

    def __repr__(self):
        return f"<TicketRoutingRule {self.role_context}/{self.category}/{self.subcategory} → {self.department_id!r}>"
