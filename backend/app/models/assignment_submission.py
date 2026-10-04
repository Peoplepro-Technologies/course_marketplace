import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=False,
    )
    learner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=True) # Text submission or URL
    submitted_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    assignment = relationship("Assignment", backref="submissions")
    learner = relationship("User")

    def __repr__(self):
        return f"<AssignmentSubmission {self.id}>"
