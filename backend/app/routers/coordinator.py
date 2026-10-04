from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.category import Category
from app.models.review import Review
from app.models.section import Section
from app.models.progress import Progress
from app.models.enrollment import Enrollment
from app.schemas.course import CourseRead, CoordinatorCourseCreate
from app.schemas.section import SectionRead
from app.schemas.category import CategoryRead, CategoryCreate, CategoryUpdate
from app.schemas.review import ReviewRead, ReviewModerateAction
from app.schemas.report import ReportResponse
from app.redis_client import invalidate_cache
from app.keycloak_admin import create_keycloak_instructor

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
    Now includes is_active, instructor_payout_rate, can_host_live_classes.
    """
    instructors = db.query(User).filter(User.role == "instructor").all()
    results = []

    for inst in instructors:
        courses = db.query(Course).filter(Course.instructor_id == inst.id).all()
        total_courses = len(courses)
        published_count = sum(1 for c in courses if c.status == "published")
        pending_review_count = sum(1 for c in courses if c.status == "pending_review")

        total_rating = sum((c.avg_rating or 0.0) for c in courses if c.avg_rating)
        rated_courses = sum(1 for c in courses if c.avg_rating and c.avg_rating > 0)
        avg_rating = round(total_rating / rated_courses, 1) if rated_courses > 0 else 0.0

        results.append({
            "id": str(inst.id),
            "name": inst.name,
            "email": inst.email,
            "is_active": inst.is_active,
            "can_host_live_classes": inst.can_host_live_classes,
            "instructor_payout_rate": inst.instructor_payout_rate,
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


@router.post("/courses", status_code=201)
def coordinator_create_course(
    data: CoordinatorCourseCreate,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Coordinator creates a course directly (not via an instructor).
    instructor_id is optional — can be assigned later.
    Course starts as 'draft' so it won't appear in public catalog yet.
    """
    instructor = None
    if data.instructor_id:
        instructor = db.query(User).filter(
            User.id == data.instructor_id,
            User.role == "instructor",
        ).first()
        if not instructor:
            raise HTTPException(status_code=404, detail="Instructor not found")

    course = Course(
        title=data.title,
        description=data.description,
        category=data.category,
        thumbnail_url=data.thumbnail_url,
        price=data.price,
        instructor_id=instructor.id if instructor else None,
        status="draft",
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    invalidate_cache("courses:*")
    return CourseRead.model_validate(course)


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


# ════════════════════════════════════════════════════════════════════════
# GROUP 2 — Instructor Lifecycle Management (Coordinator-controlled)
# GROUP 3 — Per-Instructor Custom Payout Rate
# ════════════════════════════════════════════════════════════════════════

class InstructorCreate(BaseModel):
    """Coordinator-side: create a brand new instructor from scratch."""
    name: str
    email: str
    password: str = "testpass"          # coordinator sets initial password
    instructor_payout_rate: Optional[float] = None
    can_host_live_classes: bool = True
    can_upload_video: bool = True


class AssignInstructorRequest(BaseModel):
    instructor_id: Optional[str] = None


class UpdateInstructorRequest(BaseModel):
    instructor_payout_rate: Optional[float] = None
    can_host_live_classes: Optional[bool] = None
    can_upload_video: Optional[bool] = None
    name: Optional[str] = None


@router.post("/instructors", status_code=201)
def create_instructor(
    data: InstructorCreate,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    1. Check the email isn't already in our DB.
    2. Create the user in Keycloak (Admin REST API) → get real sub UUID.
    3. Save the local User record linked to that Keycloak sub.
    4. Return the login credentials so the coordinator can share them.
    """
    # Guard: prevent duplicate local records
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An instructor with this email already exists.")

    # Provision user in Keycloak — raises HTTPException on failure
    kc_sub = create_keycloak_instructor(
        email=data.email,
        name=data.name,
        password=data.password,
    )

    # Save local record linked to real Keycloak sub
    instructor = User(
        keycloak_sub=kc_sub,
        name=data.name,
        email=data.email,
        role="instructor",
        is_active=True,
        instructor_payout_rate=data.instructor_payout_rate,
        can_host_live_classes=data.can_host_live_classes,
        can_upload_video=data.can_upload_video,
    )
    db.add(instructor)
    db.commit()
    db.refresh(instructor)
    return {
        "id": str(instructor.id),
        "name": instructor.name,
        "email": instructor.email,
        "role": instructor.role,
        "is_active": instructor.is_active,
        "instructor_payout_rate": instructor.instructor_payout_rate,
        "can_host_live_classes": instructor.can_host_live_classes,
        "can_upload_video": instructor.can_upload_video,
        # Credentials to share with the new instructor:
        "login_email": instructor.email,
        "login_password": data.password,
    }


@router.post("/courses/{course_id}/assign-instructor")
def assign_instructor_to_course(
    course_id: str,
    data: AssignInstructorRequest,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Reassign a course to a different instructor.
    Saves the previous instructor_id for transparency.
    All course content (sections, lessons, quizzes, assignments, videos)
    remains intact — it is all owned by the course, not the instructor.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if data.instructor_id is None or data.instructor_id == "discard":
        new_instructor = None
    else:
        new_instructor = db.query(User).filter(
            User.id == data.instructor_id,
            User.role == "instructor",
        ).first()
        if not new_instructor:
            raise HTTPException(status_code=404, detail="Instructor not found")

        if str(course.instructor_id) == str(data.instructor_id):
            raise HTTPException(status_code=400, detail="This instructor is already assigned to the course")

    # Record previous assignment for transparency note in coordinator UI
    course.previous_instructor_id = course.instructor_id
    course.instructor_id = new_instructor.id if new_instructor else None
    db.commit()
    invalidate_cache("courses:*")

    previous = db.query(User).filter(User.id == course.previous_instructor_id).first()
    return {
        "message": f"Course reassigned to {new_instructor.name}" if new_instructor else "Course unassigned",
        "course_id": course_id,
        "new_instructor_id": str(new_instructor.id) if new_instructor else None,
        "new_instructor_name": new_instructor.name if new_instructor else "Unassigned",
        "previous_instructor_id": str(course.previous_instructor_id) if course.previous_instructor_id else None,
        "previous_instructor_name": previous.name if previous else None,
    }


@router.get("/instructors/{instructor_id}/courses")
def get_instructor_courses(
    instructor_id: str,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Get all courses assigned to a specific instructor.
    Used during deactivation/reassignment flows.
    """
    courses = db.query(Course).filter(Course.instructor_id == instructor_id).all()
    return [CourseRead.model_validate(c) for c in courses]


@router.put("/instructors/{instructor_id}/deactivate")
def deactivate_instructor(
    instructor_id: str,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Deactivate an instructor (sets is_active=False).
    Their past course data remains intact.
    Deactivated instructors cannot log in to instructor-only pages
    (is_active check in auth blocks them).
    """
    instructor = db.query(User).filter(
        User.id == instructor_id,
        User.role == "instructor",
    ).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    if not instructor.is_active:
        raise HTTPException(status_code=400, detail="Instructor is already deactivated")

    instructor.is_active = False
    db.commit()
    return {"message": f"{instructor.name} deactivated", "is_active": False}


@router.put("/instructors/{instructor_id}/reactivate")
def reactivate_instructor(
    instructor_id: str,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """Reactivate a previously deactivated instructor."""
    instructor = db.query(User).filter(
        User.id == instructor_id,
        User.role == "instructor",
    ).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    if instructor.is_active:
        raise HTTPException(status_code=400, detail="Instructor is already active")

    instructor.is_active = True
    db.commit()
    return {"message": f"{instructor.name} reactivated", "is_active": True}


@router.put("/instructors/{instructor_id}")
def update_instructor(
    instructor_id: str,
    data: UpdateInstructorRequest,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Update instructor attributes: payout rate, can_host_live_classes, can_upload_video, name.
    Used from the Instructor Roster page.
    """
    instructor = db.query(User).filter(
        User.id == instructor_id,
        User.role == "instructor",
    ).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")

    if data.instructor_payout_rate is not None:
        if not (0 <= data.instructor_payout_rate <= 100):
            raise HTTPException(status_code=400, detail="Payout rate must be between 0 and 100")
        instructor.instructor_payout_rate = data.instructor_payout_rate
    if data.can_host_live_classes is not None:
        instructor.can_host_live_classes = data.can_host_live_classes
    if data.can_upload_video is not None:
        instructor.can_upload_video = data.can_upload_video
    if data.name is not None:
        instructor.name = data.name

    db.commit()
    db.refresh(instructor)
    return {
        "id": str(instructor.id),
        "name": instructor.name,
        "email": instructor.email,
        "is_active": instructor.is_active,
        "instructor_payout_rate": instructor.instructor_payout_rate,
        "can_host_live_classes": instructor.can_host_live_classes,
        "can_upload_video": instructor.can_upload_video,
    }


@router.get("/courses/{course_id}/assignment-detail")
def get_course_assignment_detail(
    course_id: str,
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    """
    Get current assignment details for a course including previous instructor note.
    """
    course = (
        db.query(Course)
        .options(
            joinedload(Course.instructor),
        )
        .filter(Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    previous = None
    if course.previous_instructor_id:
        previous = db.query(User).filter(User.id == course.previous_instructor_id).first()

    return {
        "course_id": course_id,
        "course_title": course.title,
        "instructor_id": str(course.instructor_id),
        "instructor_name": course.instructor.name if course.instructor else "Unknown",
        "instructor_email": course.instructor.email if course.instructor else "",
        "instructor_is_active": course.instructor.is_active if course.instructor else None,
        "previous_instructor_id": str(course.previous_instructor_id) if course.previous_instructor_id else None,
        "previous_instructor_name": previous.name if previous else None,
    }


@router.get("/faculty-assignments-quizzes")
def get_faculty_assignments_quizzes(
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    from app.models.assignment import Assignment
    from app.models.quiz import QuizQuestion
    from app.models.assignment_submission import AssignmentSubmission
    from app.models.quiz_attempt import QuizAttempt
    from app.models.lesson import Lesson

    instructors = db.query(User).filter(User.role == "instructor").all()
    results = []

    for inst in instructors:
        courses_data = []
        courses = db.query(Course).filter(Course.instructor_id == inst.id).all()
        for c in courses:
            total_enrolled = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()

            # Assignments
            assignments = (
                db.query(Assignment)
                .join(Lesson, Assignment.lesson_id == Lesson.id)
                .join(Section, Lesson.section_id == Section.id)
                .filter(Section.course_id == c.id)
                .all()
            )
            assign_data = []
            for a in assignments:
                submitted = db.query(func.count(func.distinct(AssignmentSubmission.learner_id))).filter(AssignmentSubmission.assignment_id == a.id).scalar() or 0
                assign_data.append({
                    "title": a.title,
                    "total_enrolled": total_enrolled,
                    "submitted": min(submitted, total_enrolled)
                })

            # Quizzes
            quizzes = (
                db.query(QuizQuestion)
                .join(Lesson, QuizQuestion.lesson_id == Lesson.id)
                .join(Section, Lesson.section_id == Section.id)
                .filter(Section.course_id == c.id)
                .all()
            )
            quiz_data = []
            for q in quizzes:
                attempted = db.query(func.count(func.distinct(QuizAttempt.learner_id))).filter(QuizAttempt.quiz_question_id == q.id).scalar() or 0
                quiz_data.append({
                    "title": q.question_text[:50] + ("..." if len(q.question_text) > 50 else ""),
                    "total_enrolled": total_enrolled,
                    "attempted": min(attempted, total_enrolled)
                })

            if assign_data or quiz_data:
                courses_data.append({
                    "course_title": c.title,
                    "assignments": assign_data,
                    "quizzes": quiz_data
                })
        
        if courses_data:
            results.append({
                "instructor_name": inst.name,
                "courses": courses_data
            })

    return results
