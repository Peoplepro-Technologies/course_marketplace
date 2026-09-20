"""
routers/superadmin.py — Super Admin-only endpoints.

Provides:
  - User management (list, role change, deactivate/reactivate/activate)
  - Course management (list all, status override, full moderation)
  - Category CRUD
  - Approval workflow (pending courses, approve/reject)
  - Enrollment management (list, approve, reject)
  - Finance overview (revenue estimate, recent transactions)
  - Analytics KPIs with flagged content counts
  - Review moderation (list, hide/unhide)
  - Audit logs (list)

All endpoints are protected with require_role("super_admin").
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
from app.schemas.course import CourseRead, CourseModerateAction
from app.schemas.review import ReviewRead, ReviewModerateAction
from app.schemas.enrollment import EnrollmentRead
from app.schemas.category import CategoryRead, CategoryCreate, CategoryUpdate
from app.models.support_ticket import SupportTicket, TicketReply
from app.models.platform_setting import PlatformSetting
from app.schemas.support_ticket import SupportTicketOut, SupportTicketUpdate, TicketReplyCreate, TicketReplyOut
from app.redis_client import invalidate_cache
from app.services.audit import record_audit_log

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
    current_user: User = Depends(require_role("super_admin")),
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
    return {
        "users": [UserRead.model_validate(u) for u in users],
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """Activate (set is_active=True) a user account without changing their role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    record_audit_log(
        db,
        actor_id=current_user.id,
        action="account_activated",
        target_type="user",
        target_id=str(user.id),
        details={"user_email": user.email}
    )
    db.commit()
    return {"message": "User activated", "is_active": True}


# ═══════════════════════════════════════════════════════════════════════
# 2. COURSE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

@router.get("/courses")
async def list_all_courses(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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


@router.put("/courses/{course_id}/moderate")
async def moderate_course(
    course_id: str,
    data: CourseModerateAction,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Moderate a course using action-based API (approve/reject/flag/remove).
    Supports rejection_reason field for instructor feedback.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    action_map = {
        "approve": "published",
        "reject": "rejected",
        "flag": "flagged",
        "remove": "removed",
    }
    new_status = action_map.get(data.action)
    if not new_status:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{data.action}'. Use: approve, reject, flag, remove",
        )
    old_status = course.status
    course.status = new_status
    if data.action == "reject" and hasattr(data, 'rejection_reason') and data.rejection_reason:
        course.rejection_reason = data.rejection_reason
    if new_status == "published":
        record_audit_log(db, current_user.id, "course_published", "course", str(course.id))
    elif new_status == "removed":
        record_audit_log(db, current_user.id, "course_removed", "course", str(course.id))
    db.commit()
    invalidate_cache("courses:*")
    return {"message": f"Course {data.action}d", "status": new_status, "old_status": old_status}


# ═══════════════════════════════════════════════════════════════════════
# 3. CATEGORIES CRUD
# ═══════════════════════════════════════════════════════════════════════

@router.get("/categories")
async def list_categories(
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """List all categories."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [CategoryRead.model_validate(c) for c in categories]


@router.post("/categories", status_code=201)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
# 7. ENROLLMENT MANAGEMENT (migrated from legacy admin.py)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/enrollments")
async def list_enrollments(
    status: Optional[str] = Query(None, description="Filter by enrollment status: pending, approved, rejected"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """List all enrollments across all courses, optionally filtered by status."""
    query = db.query(Enrollment)
    if status:
        query = query.filter(Enrollment.status == status)
    total = query.count()
    enrollments = (
        query.order_by(Enrollment.enrolled_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "enrollments": [EnrollmentRead.model_validate(e) for e in enrollments],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/enrollments/{enrollment_id}/approve")
async def approve_enrollment(
    enrollment_id: str,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Approve a pending enrollment, granting the learner access to lesson videos.
    Sets status to 'approved', records approved_at timestamp and approved_by admin id.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if enrollment.status == "approved":
        raise HTTPException(status_code=400, detail="Enrollment is already approved")

    enrollment.status = "approved"
    enrollment.approved_at = datetime.now(timezone.utc)
    enrollment.approved_by = current_user.id
    _audit(db, current_user.id, "enrollment_approved", "enrollment", enrollment_id)
    db.commit()
    return {
        "message": "Enrollment approved",
        "enrollment_id": str(enrollment.id),
        "status": enrollment.status,
        "approved_at": enrollment.approved_at.isoformat(),
    }


@router.put("/enrollments/{enrollment_id}/reject")
async def reject_enrollment(
    enrollment_id: str,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Reject a pending enrollment, preventing the learner from accessing lesson videos.
    Sets status to 'rejected' and clears approval metadata.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if enrollment.status == "rejected":
        raise HTTPException(status_code=400, detail="Enrollment is already rejected")

    enrollment.status = "rejected"
    enrollment.approved_at = None
    enrollment.approved_by = None
    _audit(db, current_user.id, "enrollment_rejected", "enrollment", enrollment_id)
    db.commit()
    return {
        "message": "Enrollment rejected",
        "enrollment_id": str(enrollment.id),
        "status": enrollment.status,
    }


# ═══════════════════════════════════════════════════════════════════════
# 8. REVIEWS & MODERATION
# ═══════════════════════════════════════════════════════════════════════

@router.get("/reviews")
async def list_all_reviews(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
    current_user: User = Depends(require_role("super_admin")),
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
#  TREND CHARTS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/trend-charts")
async def get_trend_charts(
    days: int = 30,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """Get simple enrollment and revenue trends for the last N days."""
    from datetime import timedelta
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Very simple aggregate: group by date
    # Note: func.date works in Postgres to extract the date
    enrollments = (
        db.query(func.date(Enrollment.enrolled_at).label("day"), func.count(Enrollment.id).label("count"))
        .filter(Enrollment.enrolled_at >= start_date)
        .group_by(func.date(Enrollment.enrolled_at))
        .order_by(func.date(Enrollment.enrolled_at))
        .all()
    )
    
    transactions = (
        db.query(func.date(Transaction.created_at).label("day"), func.sum(Transaction.amount).label("revenue"))
        .filter(Transaction.created_at >= start_date)
        .filter(Transaction.status == "completed")
        .group_by(func.date(Transaction.created_at))
        .order_by(func.date(Transaction.created_at))
        .all()
    )
    
    enrollment_data = [{"date": str(e.day), "enrollments": e.count} for e in enrollments]
    revenue_data = [{"date": str(t.day), "revenue": float(t.revenue or 0)} for t in transactions]
    
    return {
        "enrollments": enrollment_data,
        "revenue": revenue_data
    }


# ═══════════════════════════════════════════════════════════════════════
#  PLATFORM SETTINGS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/settings")
async def get_settings(
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """Get all platform settings."""
    settings = db.query(PlatformSetting).all()
    return {s.key: s.value for s in settings}

@router.put("/settings")
async def update_settings(
    settings: dict,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """Update platform settings (key-value pairs)."""
    for key, value in settings.items():
        setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            new_setting = PlatformSetting(key=key, value=str(value))
            db.add(new_setting)
    
    db.commit()
    
    # Return updated
    all_settings = db.query(PlatformSetting).all()
    return {s.key: s.value for s in all_settings}
