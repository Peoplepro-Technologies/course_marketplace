"""
routers/admin.py — Admin-only endpoints.

Provides:
  - Dashboard metrics (counts of users, courses, enrollments, reviews)
  - User listing
  - Course listing with moderation actions
  - Review moderation
"""

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
