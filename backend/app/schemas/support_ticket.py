from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class TicketReplyBase(BaseModel):
    message: str


class TicketReplyCreate(TicketReplyBase):
    pass


class TicketReplyOut(TicketReplyBase):
    id: UUID
    ticket_id: UUID
    author_id: UUID
    created_at: datetime
    author_name: Optional[str] = None

    class Config:
        from_attributes = True


class SupportTicketBase(BaseModel):
    subject: str
    description: str
    category: str = Field(..., description="First-level category, e.g. 'Payment & Refund'")
    subcategory: Optional[str] = Field(None, description="Sub-category / service request")
    priority: str = Field("medium", description="low, medium, high")


class SupportTicketCreate(SupportTicketBase):
    pass


class SupportTicketUpdate(BaseModel):
    status: Optional[str] = Field(None, description="open, in_progress, resolved, closed")
    priority: Optional[str] = Field(None, description="low, medium, high")
    assigned_to_id: Optional[UUID] = None


class SupportTicketOut(SupportTicketBase):
    id: UUID
    ticket_number: str
    sr_sequence: Optional[int] = None
    raised_by_id: UUID
    role_context: str
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None
    assigned_team: Optional[str] = None
    status: str
    assigned_to_id: Optional[UUID] = None
    last_activity_at: datetime
    last_activity_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    is_unread: bool = False

    raised_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

    replies: List[TicketReplyOut] = []

    class Config:
        from_attributes = True
