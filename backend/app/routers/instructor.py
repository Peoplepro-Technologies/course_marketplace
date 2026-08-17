"""
routers/instructor.py — Endpoints for instructors.

Provides full CRUD for courses, sections, and lessons.
Instructors can only manage their own courses.
"""

import os
import shutil
import subprocess
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.models.review import Review
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.schemas.course import CourseCreate, CourseUpdate, CourseRead
from app.schemas.section import SectionCreate, SectionUpdate, SectionRead
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonRead
from app.redis_client import invalidate_cache

router = APIRouter(prefix="/api/v1/instructor", tags=["Instructor"])

# ── Media paths (mirrors main.py resolution) ──────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_MEDIA_ROOT = os.path.normpath(os.path.join(_HERE, "..", "media"))
_VIDEOS_DIR = os.path.join(_MEDIA_ROOT, "videos")
_THUMBS_DIR = os.path.join(_MEDIA_ROOT, "thumbnails")
os.makedirs(_VIDEOS_DIR, exist_ok=True)
os.makedirs(_THUMBS_DIR, exist_ok=True)



# ═══════════════════════════════════════════════════════════════════════
#  COURSES
# ═══════════════════════════════════════════════════════════════════════

@router.get("/courses")
async def list_own_courses(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """List all courses created by the current instructor."""
    courses = (
        db.query(Course)
        .filter(Course.instructor_id == current_user.id)
        .order_by(Course.created_at.desc())
        .all()
    )
    return [CourseRead.model_validate(c) for c in courses]


@router.post("/courses", response_model=CourseRead)
async def create_course(
    data: CourseCreate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Create a new draft course."""
    course = Course(
        instructor_id=current_user.id,
        title=data.title,
        description=data.description,
        category=data.category,
        thumbnail_url=data.thumbnail_url,
        price=data.price,
        status="draft",
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return CourseRead.model_validate(course)


@router.get("/courses/{course_id}")
def get_course_detail(
    course_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db)
):
    """Get full details for a single course owned by the instructor."""
    course = (
        db.query(Course)
        .options(
            joinedload(Course.instructor),
            joinedload(Course.sections).joinedload(Section.lessons),
        )
        .filter(Course.id == course_id, Course.instructor_id == current_user.id)
        .first()
    )

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    sections_data = [SectionRead.model_validate(s) for s in course.sections]

    return {
        "course": CourseRead.model_validate(course),
        "sections": sections_data,
    }


@router.put("/courses/{course_id}", response_model=CourseRead)
async def update_course(
    course_id: str,
    data: CourseUpdate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Update an existing course (only if owned by current instructor)."""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == current_user.id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Apply partial updates
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)

    # Invalidate cache if course is published
    if course.status == "published":
        invalidate_cache("courses:*")

    return CourseRead.model_validate(course)


@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Delete a draft course (cannot delete published courses)."""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == current_user.id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.status == "published":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a published course. Unpublish it first.",
        )

    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}


@router.put("/courses/{course_id}/publish")
async def toggle_publish(
    course_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Toggle a course between draft and published status."""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == current_user.id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.status in ["draft", "rejected"]:
        course.status = "pending_review"
        course.rejection_reason = None
    elif course.status in ["published", "pending_review"]:
        course.status = "draft"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot toggle publish from status '{course.status}'",
        )

    db.commit()
    db.refresh(course)

    # Invalidate the catalog cache
    invalidate_cache("courses:*")

    return {"message": f"Course is now {course.status}", "status": course.status}


# ═══════════════════════════════════════════════════════════════════════
#  SECTIONS
# ═══════════════════════════════════════════════════════════════════════

@router.post("/courses/{course_id}/sections", response_model=SectionRead)
async def create_section(
    course_id: str,
    data: SectionCreate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Add a new section to a course."""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == current_user.id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    section = Section(
        course_id=course_id,
        title=data.title,
        order_index=data.order_index,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return SectionRead.model_validate(section)


@router.put("/sections/{section_id}", response_model=SectionRead)
async def update_section(
    section_id: str,
    data: SectionUpdate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Update a section (only if the parent course belongs to current instructor)."""
    section = (
        db.query(Section)
        .join(Course)
        .filter(Section.id == section_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(section, key, value)

    db.commit()
    db.refresh(section)
    return SectionRead.model_validate(section)


@router.delete("/sections/{section_id}")
async def delete_section(
    section_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Delete a section and all its lessons."""
    section = (
        db.query(Section)
        .join(Course)
        .filter(Section.id == section_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    db.delete(section)
    db.commit()
    return {"message": "Section deleted"}


# ═══════════════════════════════════════════════════════════════════════
#  LESSONS
# ═══════════════════════════════════════════════════════════════════════

@router.post("/sections/{section_id}/lessons", response_model=LessonRead)
async def create_lesson(
    section_id: str,
    data: LessonCreate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Add a lesson to a section."""
    section = (
        db.query(Section)
        .join(Course)
        .filter(Section.id == section_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    lesson = Lesson(
        section_id=section_id,
        title=data.title,
        content=data.content,
        order_index=data.order_index,
        duration=data.duration,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return LessonRead.model_validate(lesson)


@router.put("/lessons/{lesson_id}", response_model=LessonRead)
async def update_lesson(
    lesson_id: str,
    data: LessonUpdate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Update a lesson."""
    lesson = (
        db.query(Lesson)
        .join(Section)
        .join(Course)
        .filter(Lesson.id == lesson_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lesson, key, value)

    db.commit()
    db.refresh(lesson)
    return LessonRead.model_validate(lesson)


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Delete a lesson."""
    lesson = (
        db.query(Lesson)
        .join(Section)
        .join(Course)
        .filter(Lesson.id == lesson_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted"}


def run_ffmpeg_sync(cmd, timeout=120):
    import subprocess
    result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    return result.returncode, result.stdout, result.stderr


@router.post("/lessons/{lesson_id}/upload-video", response_model=LessonRead)
async def upload_lesson_video(
    lesson_id: str,
    video: UploadFile = File(...),
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Upload a video file for a lesson.

    - Accepts any video format supported by ffmpeg.
    - Transcodes to H.264 MP4 for web compatibility.
    - Generates a JPEG thumbnail at the 1-second mark.
    - Updates lesson.video_url and lesson.thumbnail_url.
    - Returns the updated lesson.
    """
    print(f"\n[VIDEO UPLOAD] Started for lesson_id={lesson_id}")
    # ── Verify the lesson belongs to this instructor ───────────────────
    lesson = (
        db.query(Lesson)
        .join(Section)
        .join(Course)
        .filter(Lesson.id == lesson_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not lesson:
        print(f"[VIDEO UPLOAD] Failed: Lesson {lesson_id} not found or unauthorized.")
        raise HTTPException(status_code=404, detail="Lesson not found")

    # ── Check ffmpeg is available (check PATH, winget links, or local node_modules fallback) ──
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin is None:
        # Check standard winget links folder
        links_ffmpeg = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe")
        if os.path.exists(links_ffmpeg):
            ffmpeg_bin = links_ffmpeg
        else:
            # Check workspace root node_modules fallback
            _HERE = os.path.dirname(os.path.abspath(__file__))
            workspace_root = os.path.normpath(os.path.join(_HERE, "..", "..", ".."))
            local_ffmpeg = os.path.normpath(os.path.join(workspace_root, "node_modules", "ffmpeg-static", "ffmpeg.exe"))
            if os.path.exists(local_ffmpeg):
                ffmpeg_bin = local_ffmpeg

    if ffmpeg_bin is None:
        print("[VIDEO UPLOAD] Failed: ffmpeg not found on PATH or local node_modules.")
        raise HTTPException(
            status_code=503,
            detail="ffmpeg is not installed or not on PATH.",
        )

    # ── Save the raw upload to a temp file ────────────────────────────
    unique_id = str(uuid_lib.uuid4())
    raw_ext = os.path.splitext(video.filename or "upload.mp4")[1] or ".mp4"
    raw_path = os.path.join(_VIDEOS_DIR, f"{unique_id}_raw{raw_ext}")
    out_path = os.path.join(_VIDEOS_DIR, f"{lesson_id}.mp4")
    thumb_path = os.path.join(_THUMBS_DIR, f"{lesson_id}.jpg")

    print(f"[VIDEO UPLOAD] Receiving file: {video.filename}")

    try:
        with open(raw_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # 1MB chunks
                f.write(chunk)
        
        file_size_mb = os.path.getsize(raw_path) / (1024 * 1024)
        print(f"[VIDEO UPLOAD] File saved to {raw_path} (Size: {file_size_mb:.2f} MB)")

        # ── Transcode to H.264 MP4 ────────────────────────────────────
        import asyncio
        import subprocess
        ffmpeg_cmd = [
            ffmpeg_bin, "-y",            # overwrite output
            "-i", raw_path,            # input
            "-c:v", "libx264",         # H.264 video codec
            "-preset", "fast",         # encoding speed
            "-crf", "23",              # quality
            "-c:a", "aac",             # AAC audio
            "-movflags", "+faststart", # web-optimised: moov atom at front
            "-fflags", "+genpts",      # Handle missing PTS for phone videos
            "-max_muxing_queue_size", "1024", # Handle complex multiplexing
            out_path
        ]
        print(f"[VIDEO UPLOAD] Running ffmpeg: {' '.join(ffmpeg_cmd)}")

        loop = asyncio.get_event_loop()
        try:
            returncode, stdout, stderr = await loop.run_in_executor(
                None, run_ffmpeg_sync, ffmpeg_cmd, 120
            )
        except subprocess.TimeoutExpired:
            print("[VIDEO UPLOAD] Failed: ffmpeg timed out after 120 seconds")
            raise HTTPException(status_code=500, detail="ffmpeg transcoding timed out after 120 seconds")

        print(f"[VIDEO UPLOAD] ffmpeg exit code: {returncode}")
        if returncode != 0:
            stderr_decoded = stderr.decode(errors='replace') if stderr else ""
            print(f"[VIDEO UPLOAD] ffmpeg STDERR:\n{stderr_decoded}")
            raise HTTPException(
                status_code=500,
                detail=f"ffmpeg transcoding failed. Check server logs."
            )

        # ── Extract thumbnail at 1 second ─────────────────────────────
        thumb_cmd = [
            ffmpeg_bin, "-y",
            "-i", out_path,
            "-ss", "00:00:01",   # seek to 1 second
            "-vframes", "1",     # grab exactly one frame
            "-q:v", "2",         # JPEG quality
            thumb_path
        ]
        
        try:
            thumb_rc, thumb_out, thumb_err = await loop.run_in_executor(
                None, run_ffmpeg_sync, thumb_cmd, 30
            )
            thumb_ok = thumb_rc == 0
        except subprocess.TimeoutExpired:
            thumb_ok = False

        if thumb_ok:
            print("[VIDEO UPLOAD] Thumbnail generated successfully.")
        else:
            print("[VIDEO UPLOAD] Warning: Thumbnail generation failed.")

        # ── Update the lesson record ───────────────────────────────────────
        lesson.video_url = f"/learner/lessons/{lesson_id}/video"
        if thumb_ok:
            lesson.thumbnail_url = f"/media/thumbnails/{lesson_id}.jpg"

        db.commit()
        db.refresh(lesson)
        print(f"[VIDEO UPLOAD] DB commit successful. lesson_id={lesson_id}")
        return LessonRead.model_validate(lesson)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"[VIDEO UPLOAD] Unexpected error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="An unexpected error occurred during upload.")
    finally:
        # Always remove the raw upload to save disk space
        if os.path.exists(raw_path):
            os.remove(raw_path)
            print(f"[VIDEO UPLOAD] Cleaned up raw file: {raw_path}")


# ═══════════════════════════════════════════════════════════════════════
#  REVIEWS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/reviews")
def list_instructor_reviews(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Return all reviews on courses owned by the current instructor.

    Joins reviews → courses (ownership filter) → users (learner name).
    """
    rows = (
        db.query(Review, Course, User)
        .join(Course, Review.course_id == Course.id)
        .join(User, Review.learner_id == User.id)
        .filter(Course.instructor_id == current_user.id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(review.id),
            "course_id": str(course.id),
            "course_title": course.title,
            "learner_name": learner.name,
            "rating": review.rating,
            "comment": review.comment,
            "instructor_reply": review.instructor_reply,
            "status": review.status,
            "created_at": review.created_at.isoformat(),
        }
        for review, course, learner in rows
    ]


@router.put("/reviews/{review_id}/reply")
def reply_to_review(
    review_id: str,
    reply: str = Body(..., embed=True),
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Set or update the instructor reply on a review.

    - 404 if the review does not exist.
    - 403 if the review's course does not belong to the current instructor.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Verify ownership via the course
    course = db.query(Course).filter(Course.id == review.course_id).first()
    if not course or course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to reply to this review",
        )

    review.instructor_reply = reply
    db.commit()
    db.refresh(review)

    return {
        "id": str(review.id),
        "instructor_reply": review.instructor_reply,
        "message": "Reply saved successfully",
    }


# ═══════════════════════════════════════════════════════════════════════
#  EARNINGS (STUB — finance module not yet built)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/earnings")
def get_instructor_earnings(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Calculate earnings for the current instructor based on enrollments.
    """
    from collections import defaultdict

    enrollments = (
        db.query(Enrollment, Course)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Course.instructor_id == current_user.id)
        .all()
    )

    total_earnings = 0
    pending_payout = 0
    monthly_data = defaultdict(float)

    for enrollment, course in enrollments:
        price = float(course.price) if course.price else 0.0
        total_earnings += price
        if enrollment.payout_status == "pending":
            pending_payout += price
        
        # Group by month (e.g., 'Jan', 'Feb')
        if enrollment.enrolled_at:
            month_abbr = enrollment.enrolled_at.strftime("%b")
            monthly_data[month_abbr] += price
    
    monthly = [{"month": month, "amount": round(amount, 2)} for month, amount in monthly_data.items()]

    return {
        "total_earnings": round(total_earnings, 2),
        "pending_payout": round(pending_payout, 2),
        "monthly": monthly,
    }


# ═══════════════════════════════════════════════════════════════════════
#  STUDENTS & PROGRESS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/courses/{course_id}/students")
def list_course_students(
    course_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Return all enrolled learners for a course, with per-learner progress.

    - 403 if the course does not belong to the current instructor.
    - 404 if the course does not exist.
    - No schema changes — read-only aggregation over existing tables.

    Completion is defined as progress.status == 'completed' for a lesson
    that belongs to this course (via lesson → section → course).
    """
    # ── Ownership check ───────────────────────────────────────────────
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this course's students",
        )

    # ── Total lessons in this course ──────────────────────────────────
    total_lessons = (
        db.query(func.count(Lesson.id))
        .join(Section, Lesson.section_id == Section.id)
        .filter(Section.course_id == course_id)
        .scalar()
    ) or 0

    # ── Enrolled learners ─────────────────────────────────────────────
    enrollments = (
        db.query(Enrollment, User)
        .join(User, Enrollment.learner_id == User.id)
        .filter(Enrollment.course_id == course_id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )

    results = []
    for enrollment, learner in enrollments:
        # Count completed lessons for this learner in this course
        completed = (
            db.query(func.count(Progress.id))
            .join(Lesson, Progress.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .filter(
                Section.course_id == course_id,
                Progress.learner_id == learner.id,
                Progress.status == "completed",
            )
            .scalar()
        ) or 0

        completion_pct = round((completed / total_lessons * 100), 1) if total_lessons > 0 else 0.0

        results.append({
            "learner_id": str(learner.id),
            "learner_name": learner.name,
            "email": learner.email,
            "enrolled_at": enrollment.enrolled_at.isoformat(),
            "completed_lessons": completed,
            "total_lessons": total_lessons,
            "completion_pct": completion_pct,
        })

    return {
        "course_id": course_id,
        "course_title": course.title,
        "total_lessons": total_lessons,
        "students": results,
    }
