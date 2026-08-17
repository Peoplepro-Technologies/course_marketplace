"""
routers/admin.py — Admin-only endpoints.

Provides:
  - Dashboard metrics (counts of users, courses, enrollments, reviews)
  - User listing
  - Course listing with moderation actions
  - Review moderation
  - Enrollment listing and approval/rejection workflow
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.review import Review
from app.schemas.user import UserRead
from app.schemas.course import CourseRead, CourseModerateAction
from app.schemas.review import ReviewRead, ReviewModerateAction
from app.schemas.enrollment import EnrollmentRead
from app.schemas.audit_log import AuditLogRead
from app.models.audit_log import AuditLog
from app.services.audit import record_audit_log
from app.redis_client import invalidate_cache

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/metrics")
async def get_metrics(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Dashboard metrics showing high-level platform statistics.
    """
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_courses": db.query(func.count(Course.id)).scalar(),
        "published_courses": db.query(func.count(Course.id)).filter(
            Course.status == "published"
        ).scalar(),
        "total_enrollments": db.query(func.count(Enrollment.id)).scalar(),
        "total_reviews": db.query(func.count(Review.id)).scalar(),
        "flagged_courses": db.query(func.count(Course.id)).filter(
            Course.status == "flagged"
        ).scalar(),
        "flagged_reviews": db.query(func.count(Review.id)).filter(
            Review.status == "flagged"
        ).scalar(),
    }


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Paginated user listing for admin management."""
    total = db.query(func.count(User.id)).scalar()
    users = (
        db.query(User)
        .order_by(User.created_at.desc())
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


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Deactivate a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    record_audit_log(
        db,
        actor_id=current_user.id,
        action="account_deactivated",
        target_type="user",
        target_id=str(user.id),
        details={"user_email": user.email}
    )
    db.commit()
    return {"message": "User deactivated", "is_active": False}


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Activate a user account."""
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


@router.get("/courses")
async def list_all_courses(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all courses with optional status filter for moderation."""
    query = db.query(Course)

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


@router.put("/courses/{course_id}/moderate")
async def moderate_course(
    course_id: str,
    data: CourseModerateAction,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Moderate a course:
      - approve → set status to "published"
      - flag → set status to "flagged"
      - remove → set status to "removed"
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

    course.status = new_status
    if data.action == "reject" and data.rejection_reason:
        course.rejection_reason = data.rejection_reason
        
    if new_status == "published":
        record_audit_log(db, current_user.id, "course_published", "course", str(course.id))
    elif new_status == "removed":
        record_audit_log(db, current_user.id, "course_unpublished", "course", str(course.id))

    db.commit()

    # Invalidate catalog cache
    invalidate_cache("courses:*")

    return {"message": f"Course {data.action}d", "status": new_status}


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


# ─────────────────────────────────────────────────────────────────────────────
# Enrollment management
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/enrollments")
async def list_enrollments(
    status: Optional[str] = Query(None, description="Filter by enrollment status: pending, approved, rejected"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all enrollments, optionally filtered by status."""
    query = db.query(Enrollment)
    if status:
        query = query.filter(Enrollment.status == status)

    total = query.count()
    enrollments = (
        query
        .order_by(Enrollment.enrolled_at.desc())
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
    current_user: User = Depends(require_role("admin")),
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
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Reject a pending enrollment, preventing the learner from accessing lesson videos.
    Sets status to 'rejected'.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if enrollment.status == "rejected":
        raise HTTPException(status_code=400, detail="Enrollment is already rejected")

    enrollment.status = "rejected"
    # Clear any previously set approval metadata on rejection
    enrollment.approved_at = None
    enrollment.approved_by = None
    db.commit()

    return {
        "message": "Enrollment rejected",
        "enrollment_id": str(enrollment.id),
        "status": enrollment.status,
    }


@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List platform audit logs."""
    total = db.query(func.count(AuditLog.id)).scalar()
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    return {
        "logs": [AuditLogRead.model_validate(l) for l in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
