"""
models/support_ticket.py — Support Ticket models (v2).

Changes:
  - ticket_number: now readable SR-format (SR001, SR002, …) with sequence
  - department_id: FK to departments table (department-driven routing)
  - subcategory: stores the sub-category / service request label
  - assigned_team: kept for backwards-compat but deprecated in favour of department_id
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    def _generate_ticket_number():
        return f"TKT-{uuid.uuid4().hex[:6].upper()}"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Human-readable SR number generated server-side (SR001, SR002 …)
    ticket_number = Column(String(50), unique=True, nullable=False, default=_generate_ticket_number)
    # Sequence counter for SR-format IDs (set on insert)
    sr_sequence = Column(Integer, nullable=True)

    raised_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_context = Column(String(50), nullable=False)  # "learner", "instructor", "coursecoordinator"

    # Two-level categorisation
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=True)   # service request / sub-category

    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Department routing (new)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    # Legacy team routing (kept for backwards-compat)
    assigned_team = Column(String(50), nullable=True)

    status = Column(String(50), nullable=False, default="open")  # open, in_progress, resolved, cancelled
    priority = Column(String(50), nullable=False, default="medium")  # low, medium, high
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    last_activity_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_activity_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    raised_by = relationship("User", foreign_keys=[raised_by_id], back_populates="support_tickets")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tickets")
    department = relationship("Department", back_populates="tickets")
    replies = relationship("TicketReply", back_populates="ticket", cascade="all, delete-orphan", lazy="dynamic")
    reads = relationship("TicketRead", back_populates="ticket", cascade="all, delete-orphan", lazy="dynamic")


class TicketRead(Base):
    __tablename__ = "ticket_reads"

    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    last_read_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    ticket = relationship("SupportTicket", back_populates="reads")
    user = relationship("User")


class TicketReply(Base):
    __tablename__ = "ticket_replies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    ticket = relationship("SupportTicket", back_populates="replies")
    author = relationship("User", back_populates="ticket_replies")
