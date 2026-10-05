"""
routers/superadmin.py — Super Admin-only endpoints.

Provides:
  - User management (list, role change, deactivate/reactivate)
  - Course management (list all, status override)
  - Category CRUD
  - Approval workflow (pending courses, approve/reject)
  - Finance overview (revenue estimate, recent transactions)
  - Analytics KPIs (total users, courses, enrollments, revenue)
  - Review moderation (list, hide/unhide)
  - Audit logs (list)

All endpoints are protected with require_role("admin"), which passes
for both admin and super_admin users (see auth/keycloak.py role mapping).
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.review import Review
from app.models.category import Category
from app.models.audit_log import AuditLog
from app.schemas.user import UserRead
from app.schemas.course import CourseRead
from app.schemas.review import ReviewRead, ReviewModerateAction
from app.schemas.category import CategoryRead, CategoryCreate, CategoryUpdate
from app.models.support_ticket import SupportTicket, TicketReply, TicketRead
from app.schemas.support_ticket import SupportTicketOut, SupportTicketUpdate, TicketReplyCreate, TicketReplyOut
from app.models.ticket_routing_rule import TicketRoutingRule
from app.models.department import Department
from app.services.audit import record_audit_log
from app.redis_client import invalidate_cache

router = APIRouter(prefix="/api/v1/superadmin", tags=["SuperAdmin"])

VALID_ROLES = ["learner", "instructor", "coursecoordinator", "sub_admin", "accounts", "admin", "super_admin"]


# ── Helper: create audit log entry ────────────────────────────────────

def _audit(db: Session, actor_id, action: str, target_type: str, target_id: str, details: str = None):
    """Create an audit log entry."""
    log = AuditLog(
        actor_user_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        details=details,
    )
    db.add(log)


# ═══════════════════════════════════════════════════════════════════════
# 1. USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Paginated user listing with optional search."""
    query = db.query(User)
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    users_out = []
    for u in users:
        u_dict = UserRead.model_validate(u).model_dump()
        if u.department_id:
            dept = db.query(Department).filter(Department.id == u.department_id).first()
            u_dict["department_name"] = dept.name if dept else None
        users_out.append(u_dict)
    return {
        "users": users_out,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


class RoleChangeRequest(BaseModel):
    role: str


@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    data: RoleChangeRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Change a user's role. Logs to audit trail."""
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role '{data.role}'. Valid: {VALID_ROLES}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = data.role

    _audit(db, current_user.id, "role_change", "user", user_id,
           f"Role changed from '{old_role}' to '{data.role}' for user '{user.name}'")

    db.commit()
    return {"message": f"Role updated to '{data.role}'", "old_role": old_role, "new_role": data.role}


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Deactivate a user by setting their role to 'deactivated'."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "deactivated":
        raise HTTPException(status_code=400, detail="User is already deactivated")

    old_role = user.role
    user.role = "deactivated"

    _audit(db, current_user.id, "user_deactivated", "user", user_id,
           f"User '{user.name}' deactivated (was '{old_role}')")

    db.commit()
    return {"message": "User deactivated", "old_role": old_role}


class ReactivateRequest(BaseModel):
    role: str = "learner"


@router.put("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    data: ReactivateRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Reactivate a deactivated user with a specified role."""
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role '{data.role}'")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "deactivated":
        raise HTTPException(status_code=400, detail="User is not deactivated")

    user.role = data.role

    _audit(db, current_user.id, "user_reactivated", "user", user_id,
           f"User '{user.name}' reactivated with role '{data.role}'")

    db.commit()
    return {"message": f"User reactivated as '{data.role}'"}


# ═══════════════════════════════════════════════════════════════════════
# 2. COURSE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

@router.get("/courses")
async def list_all_courses(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all courses across all instructors with instructor info."""
    query = db.query(Course).options(joinedload(Course.instructor))
    if status:
        query = query.filter(Course.status == status)

    total = query.count()
    courses = (
        query.order_by(Course.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "courses": [CourseRead.model_validate(c) for c in courses],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


class StatusOverrideRequest(BaseModel):
    status: str  # "published", "draft", "removed", "flagged"


@router.put("/courses/{course_id}/status")
async def override_course_status(
    course_id: str,
    data: StatusOverrideRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Override a course's status. Logs to audit trail."""
    valid_statuses = ["published", "draft", "removed", "flagged"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {valid_statuses}")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    old_status = course.status
    course.status = data.status

    _audit(db, current_user.id, "course_status_override", "course", course_id,
           f"Course '{course.title}' status changed from '{old_status}' to '{data.status}'")

    db.commit()
    invalidate_cache("courses:*")
    return {"message": f"Course status changed to '{data.status}'", "old_status": old_status}


# ═══════════════════════════════════════════════════════════════════════
# 3. CATEGORIES CRUD
# ═══════════════════════════════════════════════════════════════════════

@router.get("/categories")
async def list_categories(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all categories."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [CategoryRead.model_validate(c) for c in categories]


@router.post("/categories", status_code=201)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a new category."""
    existing = db.query(Category).filter(Category.name.ilike(data.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    category = Category(name=data.name, description=data.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryRead.model_validate(category)


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Update an existing category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if data.name and data.name.lower() != category.name.lower():
        existing = db.query(Category).filter(Category.name.ilike(data.name)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category with this name already exists")
        category.name = data.name

    if data.description is not None:
        category.description = data.description

    db.commit()
    db.refresh(category)
    return CategoryRead.model_validate(category)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Delete a category if it's not in use."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    in_use = db.query(Course).filter(Course.category == category.name).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Category is in use by courses and cannot be deleted.")

    db.delete(category)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════
# 4. APPROVALS (reuse coordinator logic)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/approvals/pending")
async def list_pending_approvals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List courses pending approval."""
    query = db.query(Course).options(joinedload(Course.instructor)).filter(Course.status == "pending_review")
    total = query.count()
    courses = (
        query.order_by(Course.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "courses": [CourseRead.model_validate(c) for c in courses],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


class RejectRequest(BaseModel):
    reason: str


@router.put("/approvals/{course_id}/approve")
async def approve_course(
    course_id: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Approve a pending course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or course.status != "pending_review":
        raise HTTPException(status_code=404, detail="Pending course not found")

    course.status = "published"
    course.rejection_reason = None

    _audit(db, current_user.id, "course_approved", "course", course_id,
           f"Course '{course.title}' approved and published")

    db.commit()
    invalidate_cache("courses:*")
    return {"message": "Course approved", "status": "published"}


@router.put("/approvals/{course_id}/reject")
async def reject_course(
    course_id: str,
    data: RejectRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Reject a pending course with a reason."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or course.status != "pending_review":
        raise HTTPException(status_code=404, detail="Pending course not found")

    course.status = "rejected"
    course.rejection_reason = data.reason

    _audit(db, current_user.id, "course_rejected", "course", course_id,
           f"Course '{course.title}' rejected: {data.reason}")

    db.commit()
    return {"message": "Course rejected", "status": "rejected"}


# ═══════════════════════════════════════════════════════════════════════
# 5. PAYMENTS & FINANCE (estimated/demo data)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/finance/overview")
async def finance_overview(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Revenue estimate based on course prices × approved enrollments.
    Clearly labeled as demo/estimated data — no real payment gateway.
    """
    # Total estimated revenue: sum of (course.price) for each approved enrollment
    revenue_result = (
        db.query(func.coalesce(func.sum(Course.price), 0.0))
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.status == "approved")
        .scalar()
    )

    total_revenue = float(revenue_result or 0.0)
    total_enrollments = db.query(Enrollment).filter(Enrollment.status == "approved").count()
    pending_enrollments = db.query(Enrollment).filter(Enrollment.status == "pending").count()

    return {
        "total_revenue_estimate": round(total_revenue, 2),
        "total_approved_enrollments": total_enrollments,
        "pending_enrollments": pending_enrollments,
        "is_demo_data": True,
        "note": "Revenue is estimated from course prices × approved enrollments. No real payment gateway is connected.",
    }


@router.get("/finance/transactions")
async def recent_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Recent enrollment 'transactions' — enrollments with course price info.
    Acts as a demo transaction log.
    """
    query = (
        db.query(
            Enrollment.id,
            Enrollment.status,
            Enrollment.enrolled_at,
            Enrollment.approved_at,
            User.name.label("learner_name"),
            User.email.label("learner_email"),
            Course.title.label("course_title"),
            Course.price.label("course_price"),
        )
        .join(User, Enrollment.learner_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
    )

    total = query.count()
    transactions = (
        query.order_by(Enrollment.enrolled_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "transactions": [
            {
                "id": str(t.id),
                "learner_name": t.learner_name,
                "learner_email": t.learner_email,
                "course_title": t.course_title,
                "course_price": t.course_price,
                "status": t.status,
                "enrolled_at": t.enrolled_at.isoformat() if t.enrolled_at else None,
                "approved_at": t.approved_at.isoformat() if t.approved_at else None,
            }
            for t in transactions
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "is_demo_data": True,
    }


# ═══════════════════════════════════════════════════════════════════════
# 6. REPORTS & ANALYTICS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/analytics/kpis")
async def get_kpis(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """KPI cards — real counts from the database."""
    total_users = db.query(func.count(User.id)).scalar()
    total_courses = db.query(func.count(Course.id)).scalar()
    published_courses = db.query(func.count(Course.id)).filter(Course.status == "published").scalar()
    total_enrollments = db.query(func.count(Enrollment.id)).scalar()
    total_reviews = db.query(func.count(Review.id)).scalar()
    pending_approvals = db.query(func.count(Course.id)).filter(Course.status == "pending_review").scalar()

    # Revenue estimate
    revenue = (
        db.query(func.coalesce(func.sum(Course.price), 0.0))
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.status == "approved")
        .scalar()
    )

    # Role distribution
    role_dist = (
        db.query(User.role, func.count(User.id))
        .group_by(User.role)
        .all()
    )

    return {
        "total_users": total_users,
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_enrollments": total_enrollments,
        "total_reviews": total_reviews,
        "pending_approvals": pending_approvals,
        "revenue_estimate": round(float(revenue or 0.0), 2),
        "role_distribution": [{"role": role, "count": count} for role, count in role_dist],
    }


# ═══════════════════════════════════════════════════════════════════════
# 7. REVIEWS & MODERATION
# ═══════════════════════════════════════════════════════════════════════

@router.get("/reviews")
async def list_all_reviews(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all reviews with optional status filter for moderation."""
    query = (
        db.query(Review, User.name, Course.title)
        .join(User, Review.learner_id == User.id)
        .join(Course, Review.course_id == Course.id)
    )

    if status:
        query = query.filter(Review.status == status)

    total = query.count()
    results = (
        query.order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    reviews = []
    for review, learner_name, course_title in results:
        review_data = ReviewRead.model_validate(review)
        review_data.learner_name = learner_name
        review_data.course_title = course_title
        reviews.append(review_data)

    return {
        "reviews": reviews,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/reviews/{review_id}/moderate")
async def moderate_review(
    review_id: str,
    data: ReviewModerateAction,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Moderate a review:
      - approve → set status to "active"
      - flag → set status to "flagged"
      - remove → set status to "removed"
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    action_map = {
        "approve": "active",
        "flag": "flagged",
        "remove": "removed",
    }

    new_status = action_map.get(data.action)
    if not new_status:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{data.action}'. Use: approve, flag, remove",
        )

    review.status = new_status
    db.commit()

    return {"message": f"Review {data.action}d", "status": new_status}


# ═══════════════════════════════════════════════════════════════════════
# 8. AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List audit log entries, most recent first."""
    query = db.query(AuditLog).options(joinedload(AuditLog.actor))
    total = query.count()
    logs = (
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "logs": [
            {
                "id": str(log.id),
                "actor_name": log.actor.name if log.actor else "System",
                "actor_email": log.actor.email if log.actor else "",
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": log.details,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ═══════════════════════════════════════════════════════════════════════
# 9. SUPPORT TICKETS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/support-tickets", response_model=list[SupportTicketOut])
def get_support_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    query = db.query(SupportTicket).filter(SupportTicket.assigned_team == "admin")
    if status:
        query = query.filter(SupportTicket.status == status)
    if priority:
        query = query.filter(SupportTicket.priority == priority)
    
    tickets = query.order_by(SupportTicket.updated_at.desc()).all()
    for t in tickets:
        t.raised_by_name = t.raised_by.name if t.raised_by else "Unknown"
        if t.assigned_to:
            t.assigned_to_name = t.assigned_to.name
            
        read_record = db.query(TicketRead).filter_by(ticket_id=t.id, user_id=admin.id).first()
        last_read = read_record.last_read_at if read_record else datetime.min.replace(tzinfo=timezone.utc)
        
        t.is_unread = (
            t.last_activity_at > last_read and
            t.last_activity_by != admin.id
        )
    return tickets

@router.get("/support-tickets/unread-count")
def superadmin_get_unread_count(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin"))
):
    tickets = db.query(SupportTicket).filter(SupportTicket.assigned_team == "admin").all()
    count = 0
    for ticket in tickets:
        read_record = db.query(TicketRead).filter_by(ticket_id=ticket.id, user_id=admin.id).first()
        last_read = read_record.last_read_at if read_record else datetime.min.replace(tzinfo=timezone.utc)
        if ticket.last_activity_at > last_read and ticket.last_activity_by != admin.id:
            count += 1
    return {"unread_count": count}

@router.put("/support-tickets/{ticket_id}", response_model=SupportTicketOut)
def update_support_ticket(
    ticket_id: str,
    update_data: SupportTicketUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id, 
        SupportTicket.assigned_team == "admin"
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or not in admin team")
        
    old_status = ticket.status
    if update_data.status:
        ticket.status = update_data.status
    if update_data.priority:
        ticket.priority = update_data.priority
    if update_data.assigned_to_id is not None:
        ticket.assigned_to_id = update_data.assigned_to_id
        
    if update_data.status and old_status != update_data.status:
        record_audit_log(db, admin.id, f"ticket_{update_data.status}", "support_ticket", str(ticket.id), {"ticket_number": ticket.ticket_number})
        
        ticket.last_activity_at = datetime.now(timezone.utc)
        ticket.last_activity_by = admin.id
        
    db.commit()
    db.refresh(ticket)
    
    ticket.raised_by_name = ticket.raised_by.name if ticket.raised_by else "Unknown"
    if ticket.assigned_to:
        ticket.assigned_to_name = ticket.assigned_to.name
        
    ticket.is_unread = False
    return ticket

@router.post("/support-tickets/{ticket_id}/read")
def superadmin_mark_ticket_read(
    ticket_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    read_record = db.query(TicketRead).filter_by(ticket_id=ticket_id, user_id=admin.id).first()
    if not read_record:
        read_record = TicketRead(ticket_id=ticket_id, user_id=admin.id)
        db.add(read_record)
    
    read_record.last_read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}

@router.post("/support-tickets/{ticket_id}/reply", response_model=TicketReplyOut)
def reply_support_ticket(
    ticket_id: str,
    reply_in: TicketReplyCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.assigned_team == "admin"
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or not in admin team")
        
    if ticket.status == "cancelled":
        raise HTTPException(status_code=409, detail="Cannot reply to a cancelled ticket")
        
    new_reply = TicketReply(
        ticket_id=ticket.id,
        author_id=admin.id,
        message=reply_in.message
    )
    db.add(new_reply)
    if ticket.status in ["resolved", "closed"]:
        ticket.status = "open"
        record_audit_log(db, admin.id, "ticket_reopened", "support_ticket", str(ticket.id), {"ticket_number": ticket.ticket_number})
        
    ticket.last_activity_at = datetime.now(timezone.utc)
    ticket.last_activity_by = admin.id
    
    record_audit_log(db, admin.id, "ticket_reply", "support_ticket", str(ticket.id), {"ticket_number": ticket.ticket_number})
        
    db.commit()
    db.refresh(new_reply)
    
    new_reply.author_name = admin.name
    return new_reply


# ═══════════════════════════════════════════════════════════════════════
# 10. TICKET ROUTING RULES (CRUD)
# ═══════════════════════════════════════════════════════════════════════

class RoutingRuleCreate(BaseModel):
    category: str
    assigned_role: str
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None


class RoutingRuleUpdate(BaseModel):
    assigned_role: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/ticket-routing-rules")
def list_routing_rules(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """List all ticket routing rules."""
    rules = db.query(TicketRoutingRule).order_by(TicketRoutingRule.category.asc()).all()
    return [
        {
            "id": str(r.id),
            "category": r.category,
            "assigned_role": r.assigned_role,
            "assignee_name": r.assignee_name,
            "assignee_email": r.assignee_email,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat(),
        }
        for r in rules
    ]


@router.post("/ticket-routing-rules", status_code=201)
def create_routing_rule(
    data: RoutingRuleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Create a new ticket routing rule."""
    existing = db.query(TicketRoutingRule).filter(
        TicketRoutingRule.category.ilike(data.category)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"A rule for category '{data.category}' already exists")

    rule = TicketRoutingRule(
        category=data.category,
        assigned_role=data.assigned_role,
        assignee_name=data.assignee_name,
        assignee_email=data.assignee_email,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {
        "id": str(rule.id),
        "category": rule.category,
        "assigned_role": rule.assigned_role,
        "assignee_name": rule.assignee_name,
        "assignee_email": rule.assignee_email,
        "is_active": rule.is_active,
        "created_at": rule.created_at.isoformat(),
    }


@router.put("/ticket-routing-rules/{rule_id}")
def update_routing_rule(
    rule_id: str,
    data: RoutingRuleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Update an existing routing rule (role, assignee, or active status)."""
    rule = db.query(TicketRoutingRule).filter(TicketRoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Routing rule not found")

    if data.assigned_role is not None:
        rule.assigned_role = data.assigned_role
    if data.assignee_name is not None:
        rule.assignee_name = data.assignee_name
    if data.assignee_email is not None:
        rule.assignee_email = data.assignee_email
    if data.is_active is not None:
        rule.is_active = data.is_active

    db.commit()
    db.refresh(rule)
    return {
        "id": str(rule.id),
        "category": rule.category,
        "assigned_role": rule.assigned_role,
        "assignee_name": rule.assignee_name,
        "assignee_email": rule.assignee_email,
        "is_active": rule.is_active,
        "created_at": rule.created_at.isoformat(),
    }


@router.delete("/ticket-routing-rules/{rule_id}", status_code=204)
def delete_routing_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Permanently delete a routing rule."""
    rule = db.query(TicketRoutingRule).filter(TicketRoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Routing rule not found")
    db.delete(rule)
    db.commit()


# ══════════════════════════════════════════════════════════════════
# DEPARTMENTS CRUD (Part 1)
# ══════════════════════════════════════════════════════════════════

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/departments")
def list_departments(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """List all departments."""
    depts = db.query(Department).order_by(Department.name).all()
    return [
        {
            "id": str(d.id),
            "name": d.name,
            "description": d.description,
            "is_active": d.is_active,
            "created_at": d.created_at.isoformat(),
            "user_count": db.query(User).filter(User.department_id == d.id).count(),
        }
        for d in depts
    ]


@router.post("/departments", status_code=201)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Create a new department."""
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Department '{data.name}' already exists")
    dept = Department(name=data.name, description=data.description)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"id": str(dept.id), "name": dept.name, "is_active": dept.is_active}


@router.put("/departments/{dept_id}")
def update_department(
    dept_id: str,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if data.name is not None:
        dept.name = data.name
    if data.description is not None:
        dept.description = data.description
    if data.is_active is not None:
        dept.is_active = data.is_active
    db.commit()
    return {"id": str(dept.id), "name": dept.name, "is_active": dept.is_active}


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(
    dept_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    # Check if any users are assigned
    user_count = db.query(User).filter(User.department_id == dept.id).count()
    if user_count > 0:
        raise HTTPException(status_code=409, detail=f"Cannot delete: {user_count} users are assigned to this department. Reassign them first.")
    db.delete(dept)
    db.commit()


# Assign/unassign a user's department
class UserDepartmentAssign(BaseModel):
    department_id: Optional[str] = None  # None = unassign


@router.put("/users/{user_id}/department")
def assign_user_department(
    user_id: str,
    data: UserDepartmentAssign,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Assign or unassign a user to/from a department."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.department_id:
        dept = db.query(Department).filter(Department.id == data.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        user.department_id = dept.id
        _audit(db, admin.id, "dept_assigned", "user", user_id,
               f"User '{user.name}' assigned to department '{dept.name}'")
    else:
        user.department_id = None
        _audit(db, admin.id, "dept_unassigned", "user", user_id,
               f"User '{user.name}' unassigned from department")

    db.commit()
    return {"message": "Department updated", "department_id": data.department_id}


# ══════════════════════════════════════════════════════════════════
# UPDATED TICKET ROUTING RULES (two-level: role/category/subcategory → dept)
# ══════════════════════════════════════════════════════════════════

@router.get("/ticket-routing-rules-v2")
def list_routing_rules_v2(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """List all two-level routing rules with department info."""
    rules = (
        db.query(TicketRoutingRule)
        .filter(TicketRoutingRule.role_context != None)
        .order_by(TicketRoutingRule.role_context, TicketRoutingRule.category, TicketRoutingRule.subcategory)
        .all()
    )
    out = []
    for r in rules:
        dept = db.query(Department).filter(Department.id == r.department_id).first() if r.department_id else None
        out.append({
            "id": str(r.id),
            "role_context": r.role_context,
            "category": r.category,
            "subcategory": r.subcategory,
            "department_id": str(r.department_id) if r.department_id else None,
            "department_name": dept.name if dept else None,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat(),
        })
    return out


class RoutingRuleV2Create(BaseModel):
    role_context: str
    category: str
    subcategory: str
    department_id: Optional[str] = None

class RoutingRuleV2Update(BaseModel):
    department_id: Optional[str] = None
    is_active: Optional[bool] = None


@router.post("/ticket-routing-rules-v2", status_code=201)
def create_routing_rule_v2(
    data: RoutingRuleV2Create,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    existing = db.query(TicketRoutingRule).filter(
        TicketRoutingRule.role_context == data.role_context,
        TicketRoutingRule.category == data.category,
        TicketRoutingRule.subcategory == data.subcategory,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Rule already exists")
    rule = TicketRoutingRule(
        role_context=data.role_context,
        category=data.category,
        subcategory=data.subcategory,
        department_id=data.department_id,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"id": str(rule.id), "role_context": rule.role_context,
            "category": rule.category, "subcategory": rule.subcategory}


@router.put("/ticket-routing-rules-v2/{rule_id}")
def update_routing_rule_v2(
    rule_id: str,
    data: RoutingRuleV2Update,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    rule = db.query(TicketRoutingRule).filter(TicketRoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if data.department_id is not None:
        rule.department_id = data.department_id if data.department_id else None
    if data.is_active is not None:
        rule.is_active = data.is_active
    db.commit()
    return {"id": str(rule.id), "is_active": rule.is_active}

