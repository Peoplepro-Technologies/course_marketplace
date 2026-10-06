"""
routers/support.py — Support Ticket endpoints (v2).

Changes from v1:
  - Ticket creation now uses two-level routing (role/category/subcategory → department_id)
  - ticket_number uses readable SR-NNN format
  - GET /support-tickets/department-queue — generic department queue for any dept-assigned user
  - GET /support-tickets/routing-options — returns categories and subcategories for the current user's role
  - GET /support-tickets/analytics — SA/SubAdmin analytics KPIs + filterable list
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.auth.keycloak import get_current_user
from app.auth.roles import require_any_role, require_role
from app.models.user import User
from app.models.department import Department
from app.models.support_ticket import SupportTicket, TicketReply, TicketRead
from app.models.ticket_routing_rule import TicketRoutingRule
from app.schemas.support_ticket import (
    SupportTicketOut, SupportTicketCreate, SupportTicketUpdate,
    TicketReplyOut, TicketReplyCreate
)
from app.services.audit import record_audit_log

router = APIRouter(prefix="/api/v1/support-tickets", tags=["Support Tickets"])

# Also expose a /me endpoint here for lightweight profile fetch (dept info)
me_router = APIRouter(prefix="/api/v1", tags=["Me"])

@me_router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns current user's profile including department assignment."""
    dept = db.query(Department).filter(Department.id == current_user.department_id).first() if current_user.department_id else None
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "department_id": str(current_user.department_id) if current_user.department_id else None,
        "department_name": dept.name if dept else None,
    }



# ── Helper: generate SR-NNN ticket number ─────────────────────────────

def _next_sr_number(db: Session) -> tuple[str, int]:
    """Returns (ticket_number, sr_sequence) like ('SR001', 1)."""
    last = db.query(func.max(SupportTicket.sr_sequence)).scalar() or 0
    seq = last + 1
    return f"SR{seq:03d}", seq


# ── Helper: populate transient fields on a ticket ────────────────────

def _hydrate(ticket: SupportTicket, current_user: User, db: Session):
    ticket.raised_by_name = ticket.raised_by.name if ticket.raised_by else None
    if ticket.assigned_to:
        ticket.assigned_to_name = ticket.assigned_to.name
    if ticket.department:
        ticket.department_name = ticket.department.name
    read_record = db.query(TicketRead).filter_by(
        ticket_id=ticket.id, user_id=current_user.id
    ).first()
    last_read = read_record.last_read_at if read_record else datetime.min.replace(tzinfo=timezone.utc)
    ticket.is_unread = (
        ticket.last_activity_at > last_read and
        ticket.last_activity_by != current_user.id
    )
    return ticket


# ═══════════════════════════════════════════════════════════════════════
# Routing options (dynamic dropdowns for raise-ticket form)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/routing-options")
def get_routing_options(
    category: Optional[str] = Query(None, description="If set, returns subcategories for this category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns:
      - categories: list of unique categories for the current user's role
      - subcategories: list of subcategories for the given category (if category query param set)
      - department: department name for the given category+subcategory (if both set)
    """
    role = current_user.role

    if category:
        # Return subcategories for the given category
        subcats = (
            db.query(TicketRoutingRule.subcategory, TicketRoutingRule.department_id)
            .filter(
                TicketRoutingRule.role_context == role,
                TicketRoutingRule.category == category,
                TicketRoutingRule.is_active == True,
                TicketRoutingRule.subcategory != None,
            )
            .all()
        )
        result = []
        for subcat, dept_id in subcats:
            dept = db.query(Department).filter(Department.id == dept_id).first()
            result.append({
                "subcategory": subcat,
                "department_id": str(dept_id) if dept_id else None,
                "department_name": dept.name if dept else None,
            })
        return {"subcategories": result}
    else:
        # Return unique categories for this role
        cats = (
            db.query(TicketRoutingRule.category)
            .filter(
                TicketRoutingRule.role_context == role,
                TicketRoutingRule.is_active == True,
            )
            .distinct()
            .all()
        )
        return {"categories": [c[0] for c in cats]}


# ═══════════════════════════════════════════════════════════════════════
# My Tickets (raised by current user)
# ═══════════════════════════════════════════════════════════════════════

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


@router.get("", response_model=List[SupportTicketOut])
def get_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all support tickets raised by the current user."""
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.raised_by_id == current_user.id)
        .order_by(desc(SupportTicket.updated_at))
        .all()
    )
    for ticket in tickets:
        _hydrate(ticket, current_user, db)
    return tickets


@router.post("", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
def raise_ticket(
    ticket_in: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role(["learner", "instructor", "coursecoordinator"])),
):
    """
    Raise a new support ticket with two-level routing.
    Looks up (role, category, subcategory) → department_id via TicketRoutingRule.
    """
    # Look up routing rule
    rule = (
        db.query(TicketRoutingRule)
        .filter(
            TicketRoutingRule.role_context == current_user.role,
            TicketRoutingRule.category == ticket_in.category,
            TicketRoutingRule.subcategory == ticket_in.subcategory,
            TicketRoutingRule.is_active == True,
        )
        .first()
    )

    department_id = rule.department_id if rule else None
    # Fallback: if no subcategory match, try category-only
    if not department_id and ticket_in.subcategory:
        fallback = (
            db.query(TicketRoutingRule)
            .filter(
                TicketRoutingRule.role_context == current_user.role,
                TicketRoutingRule.category == ticket_in.category,
                TicketRoutingRule.is_active == True,
            )
            .first()
        )
        department_id = fallback.department_id if fallback else None

    # Legacy assigned_team for backwards-compat
    dept = db.query(Department).filter(Department.id == department_id).first() if department_id else None
    assigned_team = dept.name.lower().replace("/", "_").replace(" ", "_") if dept else "admin"

    ticket_number, sr_sequence = _next_sr_number(db)

    new_ticket = SupportTicket(
        raised_by_id=current_user.id,
        role_context=current_user.role,
        subject=ticket_in.subject,
        description=ticket_in.description,
        category=ticket_in.category,
        subcategory=ticket_in.subcategory,
        department_id=department_id,
        assigned_team=assigned_team,
        priority=ticket_in.priority,
        ticket_number=ticket_number,
        sr_sequence=sr_sequence,
        last_activity_at=datetime.now(timezone.utc),
        last_activity_by=current_user.id,
    )
    db.add(new_ticket)
    db.flush()

    record_audit_log(db, current_user.id, "ticket_created", "support_ticket", str(new_ticket.id),
                     {"ticket_number": ticket_number, "department": dept.name if dept else None})
    db.commit()
    db.refresh(new_ticket)

    _hydrate(new_ticket, current_user, db)
    new_ticket.is_unread = False
    return new_ticket


# ═══════════════════════════════════════════════════════════════════════
# Department Queue (generic — works for ANY department-assigned user)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/department-queue", response_model=List[SupportTicketOut])
def get_department_queue(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns tickets routed to the current user's department.
    This ONE endpoint works for ANY department — Accounts, HR, IT, Academic Ops, etc.
    No new code needed when a new department is added.
    """
    if not current_user.department_id:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to any department. Contact Super Admin."
        )

    query = (
        db.query(SupportTicket)
        .filter(SupportTicket.department_id == current_user.department_id)
    )
    if status:
        query = query.filter(SupportTicket.status == status)
    if priority:
        query = query.filter(SupportTicket.priority == priority)
    if category:
        query = query.filter(SupportTicket.category.ilike(f"%{category}%"))

    tickets = query.order_by(desc(SupportTicket.created_at)).all()

    for ticket in tickets:
        ticket.raised_by_name = ticket.raised_by.name if ticket.raised_by else None
        if ticket.assigned_to:
            ticket.assigned_to_name = ticket.assigned_to.name
        if ticket.department:
            ticket.department_name = ticket.department.name
        read_record = db.query(TicketRead).filter_by(
            ticket_id=ticket.id, user_id=current_user.id
        ).first()
        last_read = read_record.last_read_at if read_record else datetime.min.replace(tzinfo=timezone.utc)
        ticket.is_unread = (
            ticket.last_activity_at > last_read and
            ticket.last_activity_by != current_user.id
        )
    return tickets


@router.put("/department-queue/{ticket_id}")
def update_department_ticket(
    ticket_id: UUID,
    data: SupportTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update status or assignment for a ticket in the user's department queue."""
    if not current_user.department_id:
        raise HTTPException(status_code=403, detail="Not assigned to any department")

    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Ticket not in your department queue")

    if data.status:
        ticket.status = data.status
    if data.assigned_to_id:
        ticket.assigned_to_id = data.assigned_to_id

    ticket.last_activity_at = datetime.now(timezone.utc)
    ticket.last_activity_by = current_user.id
    db.commit()
    return {"message": "Updated"}


@router.post("/department-queue/{ticket_id}/reply", response_model=TicketReplyOut)
def reply_department_ticket(
    ticket_id: UUID,
    reply_in: TicketReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a reply to a ticket in the user's department queue."""
    if not current_user.department_id:
        raise HTTPException(status_code=403, detail="Not assigned to any department")

    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Ticket not in your department queue")

    new_reply = TicketReply(
        ticket_id=ticket.id,
        author_id=current_user.id,
        message=reply_in.message,
    )
    db.add(new_reply)

    if ticket.status in ["resolved", "closed"]:
        ticket.status = "in_progress"
    ticket.last_activity_at = datetime.now(timezone.utc)
    ticket.last_activity_by = current_user.id
    db.commit()
    db.refresh(new_reply)
    new_reply.author_name = current_user.name
    return new_reply


@router.post("/department-queue/{ticket_id}/read")
def mark_dept_ticket_read(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    read_record = db.query(TicketRead).filter_by(ticket_id=ticket_id, user_id=current_user.id).first()
    if not read_record:
        read_record = TicketRead(ticket_id=ticket_id, user_id=current_user.id)
        db.add(read_record)
    read_record.last_read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.get("/department-queue/{ticket_id}")
def get_dept_queue_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single ticket (with replies) from current user's department queue."""
    if not current_user.department_id:
        raise HTTPException(status_code=403, detail="Not assigned to any department")
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Ticket not in your department queue")

    _hydrate(ticket, current_user, db)
    replies_out = []
    for r in sorted(ticket.replies, key=lambda x: x.created_at):
        r.author_name = r.author.name if r.author else "Unknown"
        replies_out.append({
            "id": str(r.id),
            "message": r.message,
            "author_name": r.author_name,
            "created_at": r.created_at.isoformat(),
        })
    return {
        "id": str(ticket.id),
        "ticket_number": ticket.ticket_number,
        "subject": ticket.subject,
        "description": ticket.description,
        "category": ticket.category,
        "subcategory": ticket.subcategory,
        "priority": ticket.priority,
        "status": ticket.status,
        "role_context": ticket.role_context,
        "raised_by_name": ticket.raised_by.name if ticket.raised_by else "",
        "raised_by_email": ticket.raised_by.email if ticket.raised_by else "",
        "department_name": ticket.department.name if ticket.department else None,
        "created_at": ticket.created_at.isoformat(),
        "replies": replies_out,
    }


# ═══════════════════════════════════════════════════════════════════════
# Analytics (Super Admin / Sub Admin)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/analytics")
def get_ticket_analytics(
    role: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    ticket_status: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    Platform-wide ticket analytics for Super Admin / Sub Admin.
    Returns KPI aggregates + filterable ticket list.
    SLA: High priority > 3 days = overdue, Medium > 5 days, Low > 7 days.
    """
    now = datetime.now(timezone.utc)
    SLA_HOURS = {"high": 72, "medium": 120, "low": 168}

    base_q = db.query(SupportTicket)

    if role:
        base_q = base_q.filter(SupportTicket.role_context == role)
    if department_id:
        base_q = base_q.filter(SupportTicket.department_id == department_id)
    if category:
        base_q = base_q.filter(SupportTicket.category.ilike(f"%{category}%"))
    if priority:
        base_q = base_q.filter(SupportTicket.priority == priority)
    if ticket_status:
        base_q = base_q.filter(SupportTicket.status == ticket_status)
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            base_q = base_q.filter(SupportTicket.created_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            base_q = base_q.filter(SupportTicket.created_at <= dt)
        except ValueError:
            pass

    all_tickets = base_q.order_by(desc(SupportTicket.created_at)).all()
    total = len(all_tickets)
    open_count = sum(1 for t in all_tickets if t.status == "open")
    in_progress = sum(1 for t in all_tickets if t.status == "in_progress")
    resolved = sum(1 for t in all_tickets if t.status == "resolved")
    overdue = 0
    for t in all_tickets:
        if t.status in ("open", "in_progress"):
            sla_h = SLA_HOURS.get(t.priority, 120)
            if (now - t.created_at).total_seconds() > sla_h * 3600:
                overdue += 1

    tickets_out = []
    for t in all_tickets:
        dept = db.query(Department).filter(Department.id == t.department_id).first() if t.department_id else None
        raiser = db.query(User).filter(User.id == t.raised_by_id).first()
        assignee = db.query(User).filter(User.id == t.assigned_to_id).first() if t.assigned_to_id else None
        tickets_out.append({
            "id": str(t.id),
            "ticket_number": t.ticket_number,
            "role_context": t.role_context,
            "raised_by_name": raiser.name if raiser else "",
            "raised_by_email": raiser.email if raiser else "",
            "category": t.category,
            "subcategory": t.subcategory,
            "department_name": dept.name if dept else t.assigned_team,
            "priority": t.priority,
            "status": t.status,
            "assigned_to_name": assignee.name if assignee else None,
            "created_at": t.created_at.isoformat(),
            "subject": t.subject,
        })

    return {
        "kpis": {
            "total": total,
            "open": open_count,
            "in_progress": in_progress,
            "resolved": resolved,
            "overdue": overdue,
        },
        "tickets": tickets_out,
    }


# ═══════════════════════════════════════════════════════════════════════
# Individual ticket (raised-by user view)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/{ticket_id}", response_model=SupportTicketOut)
def get_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.raised_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket")

    _hydrate(ticket, current_user, db)
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
        message=reply_in.message,
    )
    db.add(new_reply)

    if ticket.status in ["resolved", "closed", "cancelled"]:
        ticket.status = "open"
        record_audit_log(db, current_user.id, "ticket_reopened", "support_ticket",
                         str(ticket.id), {"ticket_number": ticket.ticket_number})

    ticket.last_activity_at = datetime.now(timezone.utc)
    ticket.last_activity_by = current_user.id

    record_audit_log(db, current_user.id, "ticket_reply", "support_ticket",
                     str(ticket.id), {"ticket_number": ticket.ticket_number})

    db.commit()
    db.refresh(new_reply)
    new_reply.author_name = current_user.name
    return new_reply
