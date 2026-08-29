"""
routers/public.py — Public endpoints (no auth required).

These endpoints are accessible to anyone and include:
  - Course catalog with search/filter/pagination
  - Single course detail
  - Category listing

The catalog endpoint uses Redis caching with a 5-minute TTL.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database import get_db
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.models.review import Review
from app.models.user import User
from app.models.category import Category
from app.models.enrollment import Enrollment
from app.models.live_class import LiveClass
from app.schemas.course import CourseRead, CourseListRead
from app.schemas.section import SectionRead
from app.schemas.review import ReviewRead
from app.schemas.live_class import JoinInfoRead
from app.redis_client import get_cache, set_cache
from app.auth.keycloak import get_current_user
from app.auth.roles import require_role

router = APIRouter(prefix="/api/v1/public", tags=["Public"])


@router.get("/courses", response_model=CourseListRead)
def list_courses(
    search: Optional[str] = Query(None, description="Search by title or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Browse the public course catalog.

    - Supports text search across title and description.
    - Supports category filtering.
    - Results are paginated (default 12 per page).
    - Cached in Redis for 5 minutes.
    """
    # ── Check Redis cache ─────────────────────────────────────────────
    cache_key = f"courses:list:{search}:{category}:{page}:{page_size}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    # ── Build query ───────────────────────────────────────────────────
    query = db.query(Course).options(
        joinedload(Course.instructor)
    ).filter(Course.status == "published")

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Course.title.ilike(search_term),
                Course.description.ilike(search_term),
            )
        )

    if category:
        query = query.filter(Course.category == category)

    # ── Get total count and paginated results ─────────────────────────
    total = query.count()
    courses = (
        query.order_by(Course.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    result = CourseListRead(
        courses=[CourseRead.model_validate(c) for c in courses],
        total=total,
        page=page,
        page_size=page_size,
    )

    # ── Cache the result ──────────────────────────────────────────────
    set_cache(cache_key, result.model_dump(mode="json"), ttl=300)

    return result


@router.get("/courses/{course_id}")
def get_course_detail(course_id: str, db: Session = Depends(get_db)):
    """
    Get full details for a single course, including:
      - Course info with instructor details
      - Sections and lessons (curriculum)
      - Reviews with learner names
    """
    course = (
        db.query(Course)
        .options(
            joinedload(Course.instructor),
            joinedload(Course.sections).joinedload(Section.lessons),
        )
        .filter(Course.id == course_id, Course.status == "published")
        .first()
    )

    if not course:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Course not found")

    # Build reviews with learner names
    reviews = (
        db.query(Review, User.name)
        .join(User, Review.learner_id == User.id)
        .filter(Review.course_id == course_id, Review.status == "active")
        .order_by(Review.created_at.desc())
        .all()
    )

    review_list = []
    for review, learner_name in reviews:
        review_data = ReviewRead.model_validate(review)
        review_data.learner_name = learner_name
        review_list.append(review_data)

    # Build sections with lessons
    sections_data = [SectionRead.model_validate(s) for s in course.sections]

    return {
        "course": CourseRead.model_validate(course),
        "sections": sections_data,
        "reviews": review_list,
    }


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """Return a list of all distinct course categories from the categories table."""
    categories = db.query(Category.name).order_by(Category.name.asc()).all()
    return [c[0] for c in categories if c[0]]


# ═══════════════════════════════════════════════════════════════════════
#  LIVE CLASS JOIN INFO (shared, authenticated)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/live-classes/{live_class_id}/join-info", response_model=JoinInfoRead)
def get_live_class_join_info(
    live_class_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the Jitsi room_name and metadata needed to join a live class.

    Access control:
      - The instructor who owns the live class may always access it.
      - A learner with an 'approved' enrollment in the course may access it.
      - Everyone else (pending/rejected enrollment, unauthenticated) gets 403.
    """
    live_class = db.query(LiveClass).filter(
        LiveClass.id == live_class_id
    ).first()
    if not live_class:
        raise HTTPException(status_code=404, detail="Live class not found")

    roles = getattr(current_user, "_realm_roles", [])

    # Instructor check
    if "instructor" in roles and live_class.instructor_id == current_user.id:
        return JoinInfoRead(
            id=live_class.id,
            room_name=live_class.room_name,
            title=live_class.title,
            scheduled_at=live_class.scheduled_at,
            duration_minutes=live_class.duration_minutes,
            status=live_class.status,
        )

    # Learner with approved enrollment check
    if "learner" in roles:
        enrollment = db.query(Enrollment).filter(
            Enrollment.learner_id == current_user.id,
            Enrollment.course_id == live_class.course_id,
            Enrollment.status == "approved",
        ).first()
        if enrollment:
            return JoinInfoRead(
                id=live_class.id,
                room_name=live_class.room_name,
                title=live_class.title,
                scheduled_at=live_class.scheduled_at,
                duration_minutes=live_class.duration_minutes,
                status=live_class.status,
            )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this live class",
    )
