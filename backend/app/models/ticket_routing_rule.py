"""
models/ticket_routing_rule.py — Database-driven ticket routing rules.

Maps support ticket categories to team/role queues, replacing the hardcoded
"billing → accounts, else → admin" logic in routers/support.py.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class TicketRoutingRule(Base):
    __tablename__ = "ticket_routing_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # The ticket category string to match (case-insensitive)
    category = Column(String(100), nullable=False, unique=True, index=True)
    # Target team/queue: "accounts", "admin", "HR" (HR → routes to admin queue with note)
    assigned_role = Column(String(50), nullable=False)
    # Optional human-readable assignee info (shown as a note)
    assignee_name = Column(String(255), nullable=True)
    assignee_email = Column(String(255), nullable=True)
    # Can be toggled off without deleting the rule
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self):
        return f"<TicketRoutingRule category={self.category!r} → {self.assigned_role!r}>"
