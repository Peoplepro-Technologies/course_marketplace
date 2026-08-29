"""
routers/learner.py — Endpoints for learners (requires 'learner' role).

Provides:
  - Course enrollment
  - Enrolled courses listing with progress
  - Lesson progress tracking
  - Review submission (triggers background rating recalculation)
"""

import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.auth.roles import require_role
from app.auth.keycloak import get_current_user_from_header_or_query
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.lesson import Lesson
from app.models.section import Section
from app.models.review import Review
from app.models.transaction import Transaction
from app.schemas.enrollment import EnrollmentRead
from app.schemas.progress import ProgressUpdate, ProgressRead
from app.schemas.review import ReviewCreate, ReviewRead
from app.schemas.user import UserRead, UserUpdate
from app.schemas.wishlist import WishlistRead
from app.models.wishlist import Wishlist
from app.workers.tasks import recalculate_course_rating

router = APIRouter(prefix="/api/v1/learner", tags=["Learner"])


@router.get("/profile", response_model=UserRead)
async def get_profile(
    current_user: User = Depends(require_role("learner")),
):
    """
    Get the logged-in learner's profile.
    """
    return current_user


@router.put("/profile", response_model=UserRead)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Update the logged-in learner's profile.
    """
    if data.name is not None:
        current_user.name = data.name
    if data.profile_pic is not None:
        current_user.profile_pic = data.profile_pic
    if data.bio is not None:
        current_user.bio = data.bio

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/wishlist/{course_id}")
async def add_to_wishlist(
    course_id: str,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Add a course to the learner's wishlist.
    """
    course = db.query(Course).filter(Course.id == course_id, Course.status == "published").first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or not published")

    existing = db.query(Wishlist).filter(
        Wishlist.learner_id == current_user.id,
        Wishlist.course_id == course_id,
    ).first()

    if not existing:
        wishlist_item = Wishlist(learner_id=current_user.id, course_id=course_id)
        db.add(wishlist_item)
        db.commit()

    return {"message": "Course added to wishlist"}


@router.delete("/wishlist/{course_id}")
async def remove_from_wishlist(
    course_id: str,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Remove a course from the learner's wishlist.
    """
    existing = db.query(Wishlist).filter(
        Wishlist.learner_id == current_user.id,
        Wishlist.course_id == course_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    return {"message": "Course removed from wishlist"}


@router.get("/wishlist")
async def get_wishlist(
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Get the learner's wishlist.
    """
    wishlist_items = (
        db.query(Wishlist)
        .options(joinedload(Wishlist.course).joinedload(Course.instructor))
        .filter(Wishlist.learner_id == current_user.id)
        .order_by(Wishlist.added_at.desc())
        .all()
    )

    result = []
    for item in wishlist_items:
        course = item.course
        result.append({
            "id": item.id,
            "course_id": course.id,
            "course_title": course.title,
            "course_thumbnail": course.thumbnail_url,
            "course_category": course.category,
            "instructor_name": course.instructor.name if course.instructor else "",
            "course_price": course.price,
            "added_at": item.added_at,
        })
    return result



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

    # Create enrollment — status set to "approved" immediately for this platform's
    # local enrollment flow (no external payment gateway; #55 remains MISSING).
    enrollment = Enrollment(
        learner_id=current_user.id,
        course_id=course_id,
        status="approved",
    )
    db.add(enrollment)
    
    # Create transaction for this enrollment mock payment
    transaction = Transaction(
        learner_id=current_user.id,
        course_id=course_id,
        amount=course.price,
        status="completed",
        payment_method="mock"
    )
    db.add(transaction)
    
    db.commit()
    db.refresh(enrollment)

    return {"message": "Successfully enrolled", "enrollment_id": str(enrollment.id)}


@router.get("/transactions")
async def list_transactions(
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Return the logged-in learner's transaction history.
    """
    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.course))
        .filter(Transaction.learner_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )

    result = []
    for t in transactions:
        result.append({
            "id": str(t.id),
            "course_id": str(t.course_id),
            "course_title": t.course.title if t.course else None,
            "amount": t.amount,
            "status": t.status,
            "payment_method": t.payment_method,
            "created_at": t.created_at.isoformat(),
        })

    return result


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
            "status": enrollment.status,
            "progress_percent": round(progress_percent, 1),
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
        })

    return result


@router.get("/courses/{course_id}/progress")
async def get_course_progress(
    course_id: str,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Return a list of lesson_ids the learner has completed for a given course.
    Used by LessonViewer to restore progress state on load/refresh.
    Also verifies that the learner is enrolled before returning data.
    """
    enrollment = db.query(Enrollment).filter(
        Enrollment.learner_id == current_user.id,
        Enrollment.course_id == course_id,
        Enrollment.status == "approved",
    ).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this course.",
        )

    completed = (
        db.query(Progress.lesson_id)
        .join(Lesson, Progress.lesson_id == Lesson.id)
        .join(Section, Lesson.section_id == Section.id)
        .filter(
            Section.course_id == course_id,
            Progress.learner_id == current_user.id,
            Progress.status == "completed",
        )
        .all()
    )
    return {"completed_lesson_ids": [str(row[0]) for row in completed]}


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


@router.get("/lessons/{lesson_id}/video")
async def get_lesson_video(
    lesson_id: str,
    current_user: User = Depends(get_current_user_from_header_or_query),
    db: Session = Depends(get_db),
):
    """
    Secure video streaming endpoint.
    Only allows:
    - super_admin, admin, sub_admin, course_coordinator
    - The course instructor who created the lesson
    - An enrolled learner with an "approved" enrollment status
    """
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    section = db.query(Section).filter(Section.id == lesson.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    course = db.query(Course).filter(Course.id == section.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    roles = getattr(current_user, "_realm_roles", [])
    authorized = False

    # Preview lessons are accessible to any authenticated user (regardless of enrollment)
    if lesson.is_preview:
        authorized = True

    # Check admin/staff privileges
    elif any(r in roles for r in ["super_admin", "admin", "sub_admin", "course_coordinator"]):
        authorized = True

    # Check instructor ownership
    elif "instructor" in roles and course.instructor_id == current_user.id:
        authorized = True

    # Check approved learner enrollment
    else:
        enrollment = db.query(Enrollment).filter(
            Enrollment.learner_id == current_user.id,
            Enrollment.course_id == course.id,
        ).first()
        if enrollment and enrollment.status == "approved":
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="You do not have access to this video.")

    # Resolve video path
    _HERE = os.path.dirname(os.path.abspath(__file__))
    _MEDIA_ROOT = os.path.normpath(os.path.join(_HERE, "..", "media"))
    _VIDEOS_DIR = os.path.join(_MEDIA_ROOT, "videos")
    video_path = os.path.join(_VIDEOS_DIR, f"{lesson_id}.mp4")

    # If the file doesn't exist, check if there's any file matching {lesson_id} (e.g. with different extension or fallback)
    if not os.path.exists(video_path):
        # Fallback to check raw files if any exist (e.g. for development or testing)
        raise HTTPException(status_code=404, detail="Video file not found on server.")

    # Return FileResponse which handles Range headers automatically
    return FileResponse(video_path, media_type="video/mp4")


@router.get("/transactions/{transaction_id}/invoice")
async def get_invoice(
    transaction_id: str,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Returns structured invoice data for a specific transaction.
    Restricted to the transaction's own learner.
    """
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.course).joinedload(Course.instructor))
        .filter(Transaction.id == transaction_id)
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction.learner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this invoice")

    invoice_number = f"INV-{str(transaction.id)[:8].upper()}"

    return {
        "invoice_number": invoice_number,
        "learner_name": current_user.name,
        "learner_email": current_user.email,
        "course_title": transaction.course.title if transaction.course else "Unknown Course",
        "instructor_name": transaction.course.instructor.name if transaction.course and transaction.course.instructor else "Unknown Instructor",
        "amount": transaction.amount,
        "date": transaction.created_at.isoformat(),
        "status": transaction.status,
    }

from pydantic import BaseModel

class RefundRequest(BaseModel):
    reason: str

@router.post("/transactions/{transaction_id}/request-refund")
async def request_refund(
    transaction_id: str,
    data: RefundRequest,
    current_user: User = Depends(require_role("learner")),
    db: Session = Depends(get_db),
):
    """
    Learner submits a reason and sets refund_status to "requested".
    """
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction.learner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if transaction.refund_status != "none":
        raise HTTPException(status_code=400, detail=f"Refund already {transaction.refund_status}")

    transaction.refund_status = "requested"
    transaction.refund_reason = data.reason
    db.commit()
    db.refresh(transaction)

    return {"message": "Refund requested successfully", "refund_status": transaction.refund_status}
