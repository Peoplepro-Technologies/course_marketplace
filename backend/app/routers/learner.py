"""
routers/learner.py — Endpoints for learners (requires 'learner' role).

Provides:
  - Course enrollment
  - Enrolled courses listing with progress
  - Lesson progress tracking
  - Review submission (triggers background rating recalculation)
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.lesson import Lesson
from app.models.section import Section
from app.models.review import Review
from app.schemas.enrollment import EnrollmentRead
from app.schemas.progress import ProgressUpdate, ProgressRead
from app.schemas.review import ReviewCreate, ReviewRead
from app.workers.tasks import recalculate_course_rating

router = APIRouter(prefix="/api/v1/learner", tags=["Learner"])


@router.post("/enroll/{course_id}")
async def enroll_in_course(
    course_id: str,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Enroll the current learner in a published course.
    Prevents duplicate enrollments.
    """
    # Check course exists and is published
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.status == "published",
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or not published")

    # Check for existing enrollment
    existing = db.query(Enrollment).filter(
        Enrollment.learner_id == current_user.id,
        Enrollment.course_id == course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")

    # Create enrollment
    enrollment = Enrollment(
        learner_id=current_user.id,
        course_id=course_id,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return {"message": "Successfully enrolled", "enrollment_id": str(enrollment.id)}


@router.get("/courses")
async def list_enrolled_courses(
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    List all courses the learner is enrolled in, with progress percentage.
    Progress = (completed lessons / total lessons) * 100
    """
    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course).joinedload(Course.instructor))
        .filter(Enrollment.learner_id == current_user.id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )

    result = []
    for enrollment in enrollments:
        course = enrollment.course

        # Count total lessons in the course
        total_lessons = (
            db.query(func.count(Lesson.id))
            .join(Section, Lesson.section_id == Section.id)
            .filter(Section.course_id == course.id)
            .scalar()
        )

        # Count completed lessons for this learner
        completed_lessons = (
            db.query(func.count(Progress.id))
            .join(Lesson, Progress.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .filter(
                Section.course_id == course.id,
                Progress.learner_id == current_user.id,
                Progress.status == "completed",
            )
            .scalar()
        )

        progress_percent = (
            (completed_lessons / total_lessons * 100)
            if total_lessons > 0
            else 0.0
        )

        result.append({
            "enrollment_id": str(enrollment.id),
            "course_id": str(course.id),
            "course_title": course.title,
            "course_thumbnail": course.thumbnail_url,
            "course_category": course.category,
            "instructor_name": course.instructor.name if course.instructor else "",
            "enrolled_at": enrollment.enrolled_at.isoformat(),
            "progress_percent": round(progress_percent, 1),
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
        })

    return result


@router.put("/progress")
async def update_progress(
    data: ProgressUpdate,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Update (or create) a progress record for a lesson.
    Valid statuses: not_started, in_progress, completed.
    """
    # Verify the lesson exists
    lesson = db.query(Lesson).filter(Lesson.id == data.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Find or create progress record
    progress = db.query(Progress).filter(
        Progress.learner_id == current_user.id,
        Progress.lesson_id == data.lesson_id,
    ).first()

    if progress is None:
        progress = Progress(
            learner_id=current_user.id,
            lesson_id=data.lesson_id,
            status=data.status,
        )
        db.add(progress)
    else:
        progress.status = data.status

    if data.status == "completed":
        progress.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(progress)

    return ProgressRead.model_validate(progress)


@router.post("/reviews")
async def submit_review(
    data: ReviewCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Submit a review for an enrolled course.
    Each learner can only leave one review per course.
    Triggers a background task to recalculate the course's average rating.
    """
    # Verify enrollment
    enrollment = db.query(Enrollment).filter(
        Enrollment.learner_id == current_user.id,
        Enrollment.course_id == data.course_id,
    ).first()
    if not enrollment:
        raise HTTPException(
            status_code=400,
            detail="You must be enrolled in this course to review it",
        )

    # Check for existing review
    existing = db.query(Review).filter(
        Review.learner_id == current_user.id,
        Review.course_id == data.course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this course")

    # Create review
    review = Review(
        learner_id=current_user.id,
        course_id=data.course_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # Trigger background rating recalculation
    background_tasks.add_task(recalculate_course_rating, str(data.course_id))

    return ReviewRead.model_validate(review)
