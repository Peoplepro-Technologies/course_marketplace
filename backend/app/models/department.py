"""
models/department.py — Department model (DB-driven, replaces hardcoded teams).

Departments are the "owners" of a ticket queue.  Any user with department_id set
automatically gets access to the generic Department Queue — no new dashboard needed.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    users = relationship("User", back_populates="department", lazy="dynamic")
    routing_rules = relationship("TicketRoutingRule", back_populates="department", lazy="dynamic")
    tickets = relationship("SupportTicket", back_populates="department", lazy="dynamic")

    def __repr__(self):
        return f"<Department {self.name!r}>"
