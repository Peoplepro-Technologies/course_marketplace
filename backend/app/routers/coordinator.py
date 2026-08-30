from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.category import Category
from app.models.review import Review
from app.models.section import Section
from app.models.progress import Progress
from app.models.enrollment import Enrollment
from app.schemas.course import CourseRead
from app.schemas.section import SectionRead
from app.schemas.category import CategoryRead, CategoryCreate, CategoryUpdate
from app.schemas.review import ReviewRead, ReviewModerateAction
from app.schemas.report import ReportResponse
from app.redis_client import invalidate_cache

class RejectRequest(BaseModel):
    reason: str

router = APIRouter(prefix="/api/v1/coordinator", tags=["Coordinator"])

@router.get("/instructors")
def list_instructors(
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Return all instructors and aggregate statistics across their courses.
    """
    instructors = db.query(User).filter(User.role == "instructor").all()
    results = []
    
    for inst in instructors:
        courses = db.query(Course).filter(Course.instructor_id == inst.id).all()
        total_courses = len(courses)
        published_count = sum(1 for c in courses if c.status == "published")
        pending_review_count = sum(1 for c in courses if c.status == "pending_review")
        
        # Calculate average rating across all courses
        total_rating = sum((c.avg_rating or 0.0) for c in courses if c.avg_rating)
        rated_courses = sum(1 for c in courses if c.avg_rating and c.avg_rating > 0)
        avg_rating = round(total_rating / rated_courses, 1) if rated_courses > 0 else 0.0
        
        results.append({
            "id": str(inst.id),
            "name": inst.name,
            "email": inst.email,
            "total_courses": total_courses,
            "published_count": published_count,
            "pending_review_count": pending_review_count,
            "avg_rating": avg_rating
        })
        
    return results


@router.get("/courses/pending")
def list_pending_courses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """List courses pending approval."""
    query = db.query(Course).filter(Course.status == "pending_review")
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


@router.get("/courses")
def list_all_courses(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """List all courses with optional status filter for coordinator catalog."""
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


@router.put("/courses/{course_id}/approve")
def approve_course(
    course_id: str,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """Approve a pending course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or course.status != "pending_review":
        raise HTTPException(status_code=404, detail="Pending course not found")
    
    course.status = "published"
    course.rejection_reason = None
    db.commit()
    invalidate_cache("courses:*")
    return {"message": "Course approved", "status": "published"}


@router.put("/courses/{course_id}/reject")
def reject_course(
    course_id: str,
    data: RejectRequest,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """Reject a pending course with a reason."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or course.status != "pending_review":
        raise HTTPException(status_code=404, detail="Pending course not found")
    
    course.status = "rejected"
    course.rejection_reason = data.reason
    db.commit()
    return {"message": "Course rejected", "status": "rejected"}


@router.get("/courses/{course_id}/preview")
def preview_course(
    course_id: str,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Full course detail for coordinator review.

    Unlike the public endpoint, this does NOT filter by status == 'published',
    so coordinators can preview pending_review, rejected, or draft courses
    before making approval decisions.
    """
    course = (
        db.query(Course)
        .options(
            joinedload(Course.instructor),
            joinedload(Course.sections).joinedload(Section.lessons),
        )
        .filter(Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    sections_data = [SectionRead.model_validate(s) for s in course.sections]
    return {
        "course": CourseRead.model_validate(course),
        "sections": sections_data,
    }


@router.get("/stats")
def get_coordinator_stats(
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Dashboard summary statistics for the coordinator landing page.

    Returns:
      - pending_count: number of courses awaiting review
      - recently_published: last 5 published courses (title + instructor)
      - instructor_count: total number of instructors on the platform
      - category_health: top categories by published course count
    """
    pending_count = (
        db.query(Course).filter(Course.status == "pending_review").count()
    )

    recently_published = (
        db.query(Course)
        .options(joinedload(Course.instructor))
        .filter(Course.status == "published")
        .order_by(Course.created_at.desc())
        .limit(5)
        .all()
    )

    instructor_count = (
        db.query(User).filter(User.role == "instructor").count()
    )

    category_rows = (
        db.query(Course.category, func.count(Course.id).label("count"))
        .filter(Course.status == "published", Course.category.isnot(None))
        .group_by(Course.category)
        .order_by(func.count(Course.id).desc())
        .limit(8)
        .all()
    )

    return {
        "pending_count": pending_count,
        "recently_published": [
            {
                "id": str(c.id),
                "title": c.title,
                "category": c.category,
                "instructor_name": c.instructor.name if c.instructor else "Unknown",
                "created_at": c.created_at.isoformat(),
            }
            for c in recently_published
        ],
        "instructor_count": instructor_count,
        "category_health": [
            {"category": cat, "count": count} for cat, count in category_rows
        ],
    }


# ── Categories (CRUD) ──────────────────────────────────────────────────

@router.get("/categories")
def list_categories(
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """List all categories."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [CategoryRead.model_validate(c) for c in categories]


@router.post("/categories", status_code=201)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_role("coursecoordinator")),
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
def update_category(
    category_id: str,
    data: CategoryUpdate,
    current_user: User = Depends(require_role("coursecoordinator")),
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
        
        # NOTE: Since courses.category is a string and not a FK, changing the name here
        # will NOT update existing courses that use the old name. But we allow it for now.
        category.name = data.name
        
    if data.description is not None:
        category.description = data.description
        
    db.commit()
    db.refresh(category)
    return CategoryRead.model_validate(category)


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: str,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """Delete a category if it's not in use by any courses."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    in_use = db.query(Course).filter(Course.category == category.name).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Category is currently in use by one or more courses and cannot be deleted.")
        
    db.delete(category)
    db.commit()


# ── Quality & Reviews (CRUD) ──────────────────────────────────────────

@router.get("/reviews")
def list_all_reviews(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("coursecoordinator")),
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
def moderate_review(
    review_id: str,
    data: ReviewModerateAction,
    current_user: User = Depends(require_role("coursecoordinator")),
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


# ── Reports ────────────────────────────────────────────────────────────

@router.get("/reports", response_model=ReportResponse)
def get_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """Get per-course stats: enrollments, avg rating, and completion rate."""
    total = db.query(Course).count()
    courses = (
        db.query(Course)
        .options(
            joinedload(Course.instructor),
            joinedload(Course.sections).joinedload(Section.lessons)
        )
        .order_by(Course.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    reports = []
    for c in courses:
        enrollment_count = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()
        total_lessons = sum(len(s.lessons) for s in c.sections)
        
        completion_rate = 0.0
        if enrollment_count > 0 and total_lessons > 0:
            lesson_ids = [lesson.id for s in c.sections for lesson in s.lessons]
            if lesson_ids:
                completed_count = db.query(Progress).filter(
                    Progress.lesson_id.in_(lesson_ids),
                    Progress.status == "completed"
                ).count()
                
                completion_rate = (completed_count / (enrollment_count * total_lessons)) * 100

        reports.append({
            "course_id": c.id,
            "title": c.title,
            "instructor_name": c.instructor.name if c.instructor else "Unknown",
            "enrollments_count": enrollment_count,
            "avg_rating": c.avg_rating or 0.0,
            "completion_rate": round(completion_rate, 2)
        })

    return {
        "reports": reports,
        "total": total,
        "page": page,
        "page_size": page_size,
    }

