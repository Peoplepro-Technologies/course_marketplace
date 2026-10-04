from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from uuid import UUID

from app.database import get_db
from app.auth.keycloak import get_current_user
from app.auth.roles import require_any_role
from app.models.user import User
from app.models.support_ticket import SupportTicket, TicketReply, TicketRead
from app.models.ticket_routing_rule import TicketRoutingRule
from app.schemas.support_ticket import SupportTicketOut, SupportTicketCreate, TicketReplyOut, TicketReplyCreate
from app.services.audit import record_audit_log
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/support-tickets", tags=["Support Tickets"])

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
    
    # Populate extra fields and is_unread
    for ticket in tickets:
        ticket.raised_by_name = current_user.name
        if ticket.assigned_to:
            ticket.assigned_to_name = ticket.assigned_to.name
            
        read_record = db.query(TicketRead).filter_by(ticket_id=ticket.id, user_id=current_user.id).first()
        last_read = read_record.last_read_at if read_record else datetime.min.replace(tzinfo=timezone.utc)
        
        # Unread if there is activity, it's after last read, and the user didn't cause it
        ticket.is_unread = (
            ticket.last_activity_at > last_read and
            ticket.last_activity_by != current_user.id
        )
            
    return tickets

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tickets = db.query(SupportTicket).filter(SupportTicket.raised_by_id == current_user.id).all()
    count = 0
    for ticket in tickets:
        read_record = db.query(TicketRead).filter_by(ticket_id=ticket.id, user_id=current_user.id).first()
        last_read = read_record.last_read_at if read_record else datetime.min.replace(tzinfo=timezone.utc)
        if ticket.last_activity_at > last_read and ticket.last_activity_by != current_user.id:
            count += 1
    return {"unread_count": count}


@router.post("", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
def raise_ticket(
    ticket_in: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role(["learner", "instructor", "coursecoordinator"]))
):
    """
    Raise a new support ticket.
    Routing is DB-driven: looks up ticket category in TicketRoutingRule (case-insensitive).
    HR-mapped rules route to 'admin' queue (since there is no HR dashboard yet).
    Falls back to 'admin' if no matching rule found.
    """
    # DB-driven routing lookup
    rule = (
        db.query(TicketRoutingRule)
        .filter(
            TicketRoutingRule.category.ilike(ticket_in.category),
            TicketRoutingRule.is_active == True,
        )
        .first()
    )

    if rule:
        if rule.assigned_role.lower() == "hr":
            # No HR dashboard yet – route to admin queue with assignee noted
            assigned_team = "admin"
        elif rule.assigned_role.lower() == "accounts":
            assigned_team = "accounts"
        else:
            assigned_team = "admin"
    else:
        # Fallback: no matching rule → super admin queue
        assigned_team = "admin"

    new_ticket = SupportTicket(
        raised_by_id=current_user.id,
        role_context=current_user.role,
        subject=ticket_in.subject,
        description=ticket_in.description,
        category=ticket_in.category,
        assigned_team=assigned_team,
        priority=ticket_in.priority,
        last_activity_at=datetime.now(timezone.utc),
        last_activity_by=current_user.id
    )
    db.add(new_ticket)
    db.flush()

    record_audit_log(db, current_user.id, "ticket_created", "support_ticket", str(new_ticket.id), {"ticket_number": new_ticket.ticket_number})

    db.commit()
    db.refresh(new_ticket)

    new_ticket.raised_by_name = current_user.name
    new_ticket.is_unread = False
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


@router.post("/{ticket_id}/read")
def mark_ticket_read(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    read_record = db.query(TicketRead).filter_by(ticket_id=ticket_id, user_id=current_user.id).first()
    if not read_record:
        read_record = TicketRead(ticket_id=ticket_id, user_id=current_user.id)
        db.add(read_record)
    
    read_record.last_read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


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
        
    if ticket.status == "cancelled":
        raise HTTPException(status_code=409, detail="Cannot reply to a cancelled ticket")
        
    new_reply = TicketReply(
        ticket_id=ticket.id,
        author_id=current_user.id,
        message=reply_in.message
    )
    db.add(new_reply)
    
    # Update ticket timestamp and status if it was resolved/closed
    if ticket.status in ["resolved", "closed", "cancelled"]: # actually it shouldn't reach cancelled due to check above, but if resolved/closed it reopens
        ticket.status = "open"
        record_audit_log(db, current_user.id, "ticket_reopened", "support_ticket", str(ticket.id), {"ticket_number": ticket.ticket_number})
        
    ticket.last_activity_at = datetime.now(timezone.utc)
    ticket.last_activity_by = current_user.id
    
    record_audit_log(db, current_user.id, "ticket_reply", "support_ticket", str(ticket.id), {"ticket_number": ticket.ticket_number})
        
    db.commit()
    db.refresh(new_reply)
    
    new_reply.author_name = current_user.name
    return new_reply
