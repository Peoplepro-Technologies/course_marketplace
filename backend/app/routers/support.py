from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from uuid import UUID

from app.database import get_db
from app.auth.keycloak import get_current_user
from app.models.user import User
from app.models.support_ticket import SupportTicket, TicketReply
from app.schemas.support_ticket import SupportTicketOut, SupportTicketCreate, TicketReplyOut, TicketReplyCreate

router = APIRouter(prefix="/support-tickets", tags=["Support Tickets"])

@router.get("", response_model=List[SupportTicketOut])
def get_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all support tickets raised by the current user.
    """
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.raised_by_id == current_user.id)
        .order_by(desc(SupportTicket.updated_at))
        .all()
    )
    
    # Populate extra fields
    for ticket in tickets:
        ticket.raised_by_name = current_user.name
        if ticket.assigned_to:
            ticket.assigned_to_name = ticket.assigned_to.name
            
    return tickets


@router.post("", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
def raise_ticket(
    ticket_in: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Raise a new support ticket.
    """
    new_ticket = SupportTicket(
        raised_by_id=current_user.id,
        role_context=current_user.role,
        subject=ticket_in.subject,
        description=ticket_in.description,
        category=ticket_in.category,
        priority=ticket_in.priority
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    new_ticket.raised_by_name = current_user.name
    return new_ticket


@router.get("/{ticket_id}", response_model=SupportTicketOut)
def get_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific support ticket and its replies.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket.raised_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket")
        
    ticket.raised_by_name = current_user.name
    if ticket.assigned_to:
        ticket.assigned_to_name = ticket.assigned_to.name
        
    for reply in ticket.replies:
        reply.author_name = reply.author.name
        
    return ticket


@router.post("/{ticket_id}/reply", response_model=TicketReplyOut, status_code=status.HTTP_201_CREATED)
def reply_to_ticket(
    ticket_id: UUID,
    reply_in: TicketReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a reply to an existing support ticket.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket.raised_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to reply to this ticket")
        
    new_reply = TicketReply(
        ticket_id=ticket.id,
        author_id=current_user.id,
        message=reply_in.message
    )
    db.add(new_reply)
    
    # Update ticket timestamp and status if it was resolved/closed
    if ticket.status in ["resolved", "closed"]:
        ticket.status = "open"
        
    db.commit()
    db.refresh(new_reply)
    
    new_reply.author_name = current_user.name
    return new_reply
