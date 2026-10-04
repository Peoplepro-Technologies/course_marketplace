"""
models/user.py — User model synced with Keycloak identity.

Each row corresponds to a Keycloak user, linked via `keycloak_sub` (the
"sub" claim from the JWT).  The local row is auto-created on first login.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keycloak_sub = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, default="")
    email = Column(String(255), nullable=False, default="")
    role = Column(String(50), nullable=False, default="learner")
    is_active = Column(Boolean, default=True, nullable=False)
    profile_pic = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    # Group 3: per-instructor custom payout rate (% kept by instructor, e.g. 70 = 70%).
    # NULL means use platform default (80% instructor / 20% platform).
    instructor_payout_rate = Column(Float, nullable=True)
    # Group 5: faculty flag. False = Faculty mode (no live classes). Default True.
    can_host_live_classes = Column(Boolean, default=True, nullable=False)
    can_upload_video = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────
    courses = relationship("Course", back_populates="instructor", foreign_keys="Course.instructor_id", lazy="dynamic")
    enrollments = relationship(
        "Enrollment",
        back_populates="learner",
        foreign_keys="Enrollment.learner_id",
        lazy="dynamic",
    )
    reviews = relationship("Review", back_populates="learner", lazy="dynamic")
    progress_records = relationship("Progress", back_populates="learner", lazy="dynamic")
    live_classes = relationship("LiveClass", back_populates="instructor", lazy="dynamic")
    wishlists = relationship("Wishlist", back_populates="learner", lazy="dynamic")
    support_tickets = relationship(
        "SupportTicket",
        back_populates="raised_by",
        foreign_keys="SupportTicket.raised_by_id",
        lazy="dynamic",
    )
    assigned_tickets = relationship(
        "SupportTicket",
        back_populates="assigned_to",
        foreign_keys="SupportTicket.assigned_to_id",
        lazy="dynamic",
    )
    ticket_replies = relationship("TicketReply", back_populates="author", lazy="dynamic")

    def __repr__(self):
        return f"<User {self.name} ({self.role})>"
