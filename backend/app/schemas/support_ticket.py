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
    
    # We might want author name
    author_name: Optional[str] = None

    class Config:
        orm_mode = True


class SupportTicketBase(BaseModel):
    subject: str
    description: str
    category: str = Field(..., description="billing, course, technical, account, other")
    priority: str = Field("medium", description="low, medium, high")


class SupportTicketCreate(SupportTicketBase):
    pass


class SupportTicketUpdate(BaseModel):
    status: Optional[str] = Field(None, description="open, in_progress, resolved, closed")
    priority: Optional[str] = Field(None, description="low, medium, high")
    assigned_to_id: Optional[UUID] = None


class SupportTicketOut(SupportTicketBase):
    id: UUID
    raised_by_id: UUID
    role_context: str
    status: str
    assigned_to_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    raised_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    
    replies: List[TicketReplyOut] = []

    class Config:
        orm_mode = True
