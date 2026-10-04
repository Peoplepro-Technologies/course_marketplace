"""
routers/instructor.py — Endpoints for instructors.

Provides full CRUD for courses, sections, and lessons.
Instructors can only manage their own courses.
"""

import os
import shutil
import subprocess
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body, BackgroundTasks
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
from app.models.transaction import Transaction
from app.models.instructor_payout import InstructorPayout
from app.models.live_class import LiveClass
from app.utils.ffmpeg import get_ffmpeg_executable, run_ffmpeg_sync
from app.services.transcription import transcribe_lesson_video
from app.schemas.course import CourseCreate, CourseUpdate, CourseRead
from app.schemas.section import SectionCreate, SectionUpdate, SectionRead
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonRead
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonRead
from app.schemas.live_class import LiveClassCreate, LiveClassRead
from app.schemas.user import UserRead, UserUpdate
from app.redis_client import invalidate_cache
from app.config import get_settings


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


@router.post("/courses/{course_id}/upload-thumbnail", response_model=CourseRead)
async def upload_course_thumbnail(
    course_id: str,
    thumbnail: UploadFile = File(...),
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Upload a thumbnail image for a course."""
    course = db.query(Course).filter(
        Course.id == course_id, Course.instructor_id == current_user.id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or permission denied")

    import os
    here = os.path.dirname(os.path.abspath(__file__))
    media_root = os.path.join(os.path.dirname(here), "media")
    os.makedirs(os.path.join(media_root, "thumbnails"), exist_ok=True)

    file_ext = os.path.splitext(thumbnail.filename)[1] or ".jpg"
    thumb_filename = f"course_{course_id}{file_ext}"
    thumb_path = os.path.join(media_root, "thumbnails", thumb_filename)

    try:
        with open(thumb_path, "wb") as f:
            while chunk := await thumbnail.read(1024 * 1024):
                f.write(chunk)
    except Exception as e:
        print(f"Failed to save course thumbnail: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    course.thumbnail_url = f"/media/thumbnails/{thumb_filename}"
    db.commit()
    db.refresh(course)

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
        video_url=data.video_url,
        thumbnail_url=data.thumbnail_url,
    )
    db.add(lesson)
    db.flush()  # get lesson.id before commit

    # Auto-set is_preview for the very first lesson of the very first section
    course = db.query(Course).filter(Course.id == section.course_id).first()
    if course:
        all_sections = sorted(
            db.query(Section).filter(Section.course_id == course.id).all(),
            key=lambda s: s.order_index
        )
        if all_sections and str(all_sections[0].id) == str(section_id):
            # This is the first section — check if lesson is first
            existing_lessons = db.query(Lesson).filter(
                Lesson.section_id == section_id,
                Lesson.id != lesson.id
            ).all()
            if len(existing_lessons) == 0:
                # No other lessons yet — this is the first lesson
                lesson.is_preview = True

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


@router.put("/lessons/{lesson_id}/toggle-preview")
async def toggle_lesson_preview(
    lesson_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Toggle the is_preview flag on a lesson."""
    lesson = (
        db.query(Lesson)
        .join(Section)
        .join(Course)
        .filter(Lesson.id == lesson_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson.is_preview = not lesson.is_preview
    db.commit()
    db.refresh(lesson)
    return {"is_preview": lesson.is_preview}


def _compute_transcode_timeout(file_size_bytes: int) -> int:
    """
    Returns a dynamic ffmpeg timeout in seconds based on file size.
    Base: 600 s (10 min), plus 60 s for every 100 MB.
    This comfortably handles 8-minute+ videos on modest hardware.
    """
    extra = int(file_size_bytes / (100 * 1024 * 1024)) * 60
    return 600 + extra


def _transcode_and_update_lesson(
    lesson_id: str,
    raw_path: str,
    out_path: str,
    thumb_path: str,
    ffmpeg_executable: str,
) -> None:
    """
    Background task: transcode the raw upload to H.264 MP4, extract a
    thumbnail, update the lesson record in the DB, and kick off
    transcription — all without blocking the HTTP response.
    """
    import subprocess
    from app.database import SessionLocal

    print(f"\n[VIDEO TRANSCODE BG] Starting for lesson_id={lesson_id}")
    db = SessionLocal()
    try:
        file_size = os.path.getsize(raw_path) if os.path.exists(raw_path) else 0
        file_size_mb = file_size / (1024 * 1024)
        transcode_timeout = _compute_transcode_timeout(file_size)
        print(f"[VIDEO TRANSCODE BG] File size: {file_size_mb:.1f} MB — timeout: {transcode_timeout}s")

        ffmpeg_cmd = [
            ffmpeg_executable, "-y",
            "-i", raw_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-movflags", "+faststart",
            "-fflags", "+genpts",
            "-max_muxing_queue_size", "1024",
            out_path
        ]
        print(f"[VIDEO TRANSCODE BG] Running ffmpeg (timeout={transcode_timeout}s): {' '.join(ffmpeg_cmd)}")

        try:
            returncode, stdout, stderr = run_ffmpeg_sync(ffmpeg_cmd, timeout=transcode_timeout)
        except subprocess.TimeoutExpired:
            print(f"[VIDEO TRANSCODE BG] ffmpeg timed out after {transcode_timeout}s — lesson_id={lesson_id}")
            # Mark lesson with an error indicator in video_url so instructor knows
            lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
            if lesson:
                lesson.video_url = None
                db.commit()
            return

        if returncode != 0:
            stderr_decoded = stderr.decode(errors="replace") if stderr else ""
            print(f"[VIDEO TRANSCODE BG] ffmpeg failed (code {returncode}):\n{stderr_decoded}")
            lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
            if lesson:
                lesson.video_url = None
                db.commit()
            return

        print(f"[VIDEO TRANSCODE BG] Transcode succeeded for lesson_id={lesson_id}")

        # ── Thumbnail ──────────────────────────────────────────────────
        thumb_cmd = [
            ffmpeg_executable, "-y",
            "-i", out_path,
            "-ss", "00:00:01",
            "-vframes", "1",
            "-q:v", "2",
            thumb_path
        ]
        try:
            thumb_rc, _, _ = run_ffmpeg_sync(thumb_cmd, timeout=60)
            thumb_ok = thumb_rc == 0
        except subprocess.TimeoutExpired:
            thumb_ok = False

        # ── Extract duration via ffprobe ───────────────────────────────
        duration_seconds = None
        ffprobe_bin = shutil.which("ffprobe") or ffmpeg_executable.replace("ffmpeg", "ffprobe")
        if ffprobe_bin and os.path.exists(ffprobe_bin if os.path.isfile(ffprobe_bin) else ""):
            try:
                probe_cmd = [
                    ffprobe_bin, "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    out_path
                ]
                probe_result = subprocess.run(probe_cmd, capture_output=True, timeout=30)
                if probe_result.returncode == 0:
                    raw_dur = probe_result.stdout.decode().strip()
                    duration_seconds = round(float(raw_dur)) if raw_dur else None
            except Exception as probe_err:
                print(f"[VIDEO TRANSCODE BG] ffprobe duration extraction failed: {probe_err}")

        # ── Update DB ─────────────────────────────────────────────────
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if lesson:
            lesson.video_url = f"/learner/lessons/{lesson_id}/video"
            if thumb_ok:
                lesson.thumbnail_url = f"/media/thumbnails/{lesson_id}.jpg"
                print(f"[VIDEO TRANSCODE BG] Thumbnail saved for lesson_id={lesson_id}")
            if duration_seconds is not None:
                # Convert seconds → minutes (round up to nearest minute, minimum 1)
                duration_minutes = max(1, round(duration_seconds / 60))
                lesson.duration = duration_minutes
                print(f"[VIDEO TRANSCODE BG] Auto-set duration={duration_seconds}s → {duration_minutes}min for lesson_id={lesson_id}")
            db.commit()
            db.refresh(lesson)
            print(f"[VIDEO TRANSCODE BG] DB updated for lesson_id={lesson_id}")

        # ── Kick off transcription ─────────────────────────────────────
        transcribe_lesson_video(lesson_id, out_path)

    except Exception as exc:
        import traceback
        print(f"[VIDEO TRANSCODE BG] Unexpected error for lesson_id={lesson_id}: {exc}")
        print(traceback.format_exc())
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        # Clean up the raw upload
        if os.path.exists(raw_path):
            try:
                os.remove(raw_path)
                print(f"[VIDEO TRANSCODE BG] Cleaned up raw file: {raw_path}")
            except OSError:
                pass
        db.close()



@router.post("/lessons/{lesson_id}/upload-video", response_model=LessonRead)
async def upload_lesson_video(
    lesson_id: str,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Upload a video file for a lesson.

    - Accepts any video format supported by ffmpeg.
    - Saves the raw file immediately, then transcodes to H.264 MP4 in a
      background task (non-blocking) so the HTTP response returns right away.
    - Dynamic timeout: 600 s base + 60 s per 100 MB (handles 8-min+ videos).
    - Generates a JPEG thumbnail and auto-detects duration via ffprobe.
    - Updates lesson.video_url, lesson.thumbnail_url, and lesson.duration.
    """
    print(f"\n[VIDEO UPLOAD] Started for lesson_id={lesson_id}")

    if not current_user.can_upload_video:
        raise HTTPException(status_code=403, detail="Faculty accounts are restricted to assignments and quizzes and cannot upload videos.")

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

    # ── Check ffmpeg is available ──────────────────────────────────────
    ffmpeg_executable = get_ffmpeg_executable()
    if not ffmpeg_executable:
        print("[VIDEO UPLOAD] Failed: ffmpeg not found.")
        raise HTTPException(
            status_code=503,
            detail=(
                "ffmpeg is not installed or not found. "
                "Install it with: winget install ffmpeg — or configure FFMPEG_PATH in backend/.env."
            ),
        )

    # ── Save the raw upload ────────────────────────────────────────────
    unique_id = str(uuid_lib.uuid4())
    raw_ext = os.path.splitext(video.filename or "upload.mp4")[1] or ".mp4"
    raw_path = os.path.join(_VIDEOS_DIR, f"{unique_id}_raw{raw_ext}")
    out_path = os.path.join(_VIDEOS_DIR, f"{lesson_id}.mp4")
    thumb_path = os.path.join(_THUMBS_DIR, f"{lesson_id}.jpg")

    print(f"[VIDEO UPLOAD] Receiving file: {video.filename}")
    try:
        with open(raw_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # 1 MB chunks
                f.write(chunk)
    except Exception as e:
        import traceback
        print(f"[VIDEO UPLOAD] Failed to save raw file: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    file_size_mb = os.path.getsize(raw_path) / (1024 * 1024)
    print(f"[VIDEO UPLOAD] File saved to {raw_path} ({file_size_mb:.2f} MB). Queuing transcode as background task.")

    # ── Mark lesson as 'processing' and return immediately ─────────────
    # The actual transcode happens in the background; video_url gets the
    # real serving URL once _transcode_and_update_lesson() finishes.
    lesson.video_url = f"processing:{lesson_id}"
    db.commit()
    db.refresh(lesson)

    background_tasks.add_task(
        _transcode_and_update_lesson,
        lesson_id,
        raw_path,
        out_path,
        thumb_path,
        ffmpeg_executable,
    )
    print(f"[VIDEO UPLOAD] Background transcode task queued for lesson_id={lesson_id}")

    return LessonRead.model_validate(lesson)


@router.post("/lessons/{lesson_id}/upload-thumbnail", response_model=LessonRead)
async def upload_lesson_thumbnail(
    lesson_id: str,
    thumbnail: UploadFile = File(...),
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Upload a thumbnail image for a lesson."""
    lesson = (
        db.query(Lesson)
        .join(Section)
        .join(Course)
        .filter(Lesson.id == lesson_id, Course.instructor_id == current_user.id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found or you don't have permission")

    import os
    # Get the directory where this file (instructor.py) lives, then go up one level to 'app'
    here = os.path.dirname(os.path.abspath(__file__))
    media_root = os.path.join(os.path.dirname(here), "media")
    os.makedirs(os.path.join(media_root, "thumbnails"), exist_ok=True)
    
    file_ext = os.path.splitext(thumbnail.filename)[1] or ".jpg"
    thumb_filename = f"{lesson_id}{file_ext}"
    thumb_path = os.path.join(media_root, "thumbnails", thumb_filename)

    try:
        with open(thumb_path, "wb") as f:
            while chunk := await thumbnail.read(1024 * 1024):
                f.write(chunk)
    except Exception as e:
        print(f"Failed to save thumbnail: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    lesson.thumbnail_url = f"/media/thumbnails/{thumb_filename}"
    db.commit()
    db.refresh(lesson)

    return LessonRead.model_validate(lesson)


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
    Calculate earnings for the current instructor based on valid transactions.
    """
    from collections import defaultdict

    # Fetch valid transactions (completed, not refunded) for the instructor's courses
    transactions_data = (
        db.query(Transaction, InstructorPayout)
        .join(Course, Transaction.course_id == Course.id)
        .outerjoin(InstructorPayout, Transaction.included_in_payout_id == InstructorPayout.id)
        .filter(Course.instructor_id == current_user.id)
        .filter(Transaction.status == "completed")
        .filter(Transaction.refund_status == "none")
        .all()
    )

    total_earnings = 0
    pending_payout = 0
    monthly_data = defaultdict(float)

    for transaction, payout in transactions_data:
        amount = transaction.amount
        total_earnings += amount
        
        # Pending if not included in any payout OR included but payout is still "pending"
        if transaction.included_in_payout_id is None or (payout and payout.status == "pending"):
            pending_payout += amount
        
        # Group by month (e.g., 'Jan', 'Feb')
        if transaction.created_at:
            month_abbr = transaction.created_at.strftime("%b")
            monthly_data[month_abbr] += amount
    
    monthly = [{"month": month, "amount": round(amount, 2)} for month, amount in monthly_data.items()]

    return {
        "total_earnings": round(total_earnings, 2),
        "pending_payout": round(pending_payout, 2),
        "monthly": monthly,
    }

@router.get("/payouts")
def get_instructor_payouts(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Get the payout history for the logged-in instructor.
    """
    payouts = (
        db.query(InstructorPayout)
        .filter(InstructorPayout.instructor_id == current_user.id)
        .order_by(InstructorPayout.created_at.desc())
        .all()
    )
    
    return [
        {
            "id": str(p.id),
            "period_start": p.period_start.isoformat() if p.period_start else None,
            "period_end": p.period_end.isoformat() if p.period_end else None,
            "total_amount": p.total_amount,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "released_at": p.released_at.isoformat() if p.released_at else None,
        }
        for p in payouts
    ]


# ═══════════════════════════════════════════════════════════════════════
#  STUDENTS & PROGRESS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/students")
def list_all_students(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Return all enrolled learners across all courses for this instructor."""
    enrollments = (
        db.query(Enrollment, User, Course)
        .join(User, Enrollment.learner_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Course.instructor_id == current_user.id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )
    
    results = []
    for enrollment, learner, course in enrollments:
        total_lessons = db.query(func.count(Lesson.id)).join(Section, Lesson.section_id == Section.id).filter(Section.course_id == course.id).scalar() or 0
        completed = (
            db.query(func.count(Progress.id))
            .join(Lesson, Progress.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .filter(
                Section.course_id == course.id,
                Progress.learner_id == learner.id,
                Progress.status == "completed"
            )
            .scalar()
        ) or 0
        
        results.append({
            "enrollment_id": str(enrollment.id),
            "status": enrollment.status,
            "learner_id": str(learner.id) + "_" + str(course.id),
            "real_learner_id": str(learner.id),
            "course_id": str(course.id),
            "learner_name": learner.name,
            "email": learner.email,
            "course_title": course.title,
            "enrolled_at": enrollment.enrolled_at,
            "completed_lessons": completed,
            "total_lessons": total_lessons,
            "completion_pct": int((completed / total_lessons * 100) if total_lessons > 0 else 0),
        })
    return {"course_title": "All Courses", "total_lessons": 0, "students": results}


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
            "enrollment_id": str(enrollment.id),
            "status": enrollment.status,
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


# ═══════════════════════════════════════════════════════════════════════
#  LIVE CLASSES
# ═══════════════════════════════════════════════════════════════════════

@router.post("/courses/{course_id}/live-classes", response_model=LiveClassRead)
async def schedule_live_class(
    course_id: str,
    payload: LiveClassCreate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """
    Schedule a new live class for a course owned by the current instructor.
    Auto-generates a unique Jitsi room_name.
    """
    if not current_user.can_host_live_classes:
        raise HTTPException(status_code=403, detail="Your account is restricted to faculty mode (no live classes).")

    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == current_user.id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or not yours")

    room_name = f"coursemkt-{uuid_lib.uuid4().hex}"
    live_class = LiveClass(
        course_id=course.id,
        instructor_id=current_user.id,
        title=payload.title,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        room_name=room_name,
        status="scheduled",
    )
    db.add(live_class)
    db.commit()
    db.refresh(live_class)

    result = LiveClassRead.model_validate(live_class)
    result.course_title = course.title
    return result


@router.get("/live-classes", response_model=list[LiveClassRead])
async def list_instructor_live_classes(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """List all live classes scheduled by this instructor (across all courses)."""
    from sqlalchemy.orm import joinedload
    live_classes = (
        db.query(LiveClass)
        .options(joinedload(LiveClass.course))
        .filter(LiveClass.instructor_id == current_user.id)
        .order_by(LiveClass.scheduled_at.desc())
        .all()
    )
    results = []
    for lc in live_classes:
        item = LiveClassRead.model_validate(lc)
        item.course_title = lc.course.title if lc.course else None
        results.append(item)
    return results


@router.put("/live-classes/{live_class_id}/start", response_model=LiveClassRead)
async def start_live_class(
    live_class_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Mark a scheduled live class as 'live'. Only the owning instructor can do this."""
    if not current_user.can_host_live_classes:
        raise HTTPException(status_code=403, detail="Your account is restricted to faculty mode (no live classes).")
    live_class = db.query(LiveClass).filter(
        LiveClass.id == live_class_id,
        LiveClass.instructor_id == current_user.id,
    ).first()
    if not live_class:
        raise HTTPException(status_code=404, detail="Live class not found or not yours")
    if live_class.status == "ended":
        raise HTTPException(status_code=400, detail="Cannot start a class that has already ended")
    live_class.status = "live"
    db.commit()
    db.refresh(live_class)
    return LiveClassRead.model_validate(live_class)


@router.put("/live-classes/{live_class_id}/end", response_model=LiveClassRead)
async def end_live_class(
    live_class_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Mark a live class as 'ended'. Only the owning instructor can do this."""
    if not current_user.can_host_live_classes:
        raise HTTPException(status_code=403, detail="Your account is restricted to faculty mode (no live classes).")
    live_class = db.query(LiveClass).filter(
        LiveClass.id == live_class_id,
        LiveClass.instructor_id == current_user.id,
    ).first()
    if not live_class:
        raise HTTPException(status_code=404, detail="Live class not found or not yours")
    if live_class.status != "live":
        raise HTTPException(status_code=400, detail="Can only end a class that is currently live")
    live_class.status = "ended"
    db.commit()
    db.refresh(live_class)
    return LiveClassRead.model_validate(live_class)


@router.delete("/live-classes/{live_class_id}", status_code=204)
async def delete_live_class(
    live_class_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Cancel/delete a scheduled live class. Cannot delete if already live or ended."""
    if not current_user.can_host_live_classes:
        raise HTTPException(status_code=403, detail="Your account is restricted to faculty mode (no live classes).")
    live_class = db.query(LiveClass).filter(
        LiveClass.id == live_class_id,
        LiveClass.instructor_id == current_user.id,
    ).first()
    if not live_class:
        raise HTTPException(status_code=404, detail="Live class not found or not yours")
    if live_class.status in ("live", "ended"):
        raise HTTPException(status_code=400, detail="Can only cancel a scheduled class")
    db.delete(live_class)
    db.commit()
    return None


# ═══════════════════════════════════════════════════════════════════════
#  QUIZ QUESTIONS
# ═══════════════════════════════════════════════════════════════════════

@router.post("/lessons/{lesson_id}/quiz-questions")
async def add_quiz_question(
    lesson_id: str,
    payload: dict,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Add a quiz question to a lesson the instructor owns."""
    from app.models.quiz import QuizQuestion
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    # Verify ownership via section -> course
    section = db.query(Section).filter(Section.id == lesson.section_id).first()
    course = db.query(Course).filter(
        Course.id == section.course_id,
        Course.instructor_id == current_user.id
    ).first()
    if not course:
        raise HTTPException(status_code=403, detail="Not your course")

    q = QuizQuestion(
        lesson_id=lesson_id,
        question_text=payload.get("question_text", ""),
        options=payload.get("options", []),
        correct_option_index=payload.get("correct_option_index", 0),
        explanation=payload.get("explanation", ""),
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {
        "id": str(q.id),
        "lesson_id": str(q.lesson_id),
        "question_text": q.question_text,
        "options": q.options,
        "correct_option_index": q.correct_option_index,
        "explanation": q.explanation,
    }


@router.get("/lessons/{lesson_id}/quiz-questions")
async def list_quiz_questions(
    lesson_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """List quiz questions for a lesson."""
    from app.models.quiz import QuizQuestion
    questions = db.query(QuizQuestion).filter(QuizQuestion.lesson_id == lesson_id).all()
    return [
        {
            "id": str(q.id),
            "lesson_id": str(q.lesson_id),
            "question_text": q.question_text,
            "options": q.options,
            "correct_option_index": q.correct_option_index,
            "explanation": q.explanation,
        }
        for q in questions
    ]


@router.delete("/quiz-questions/{question_id}", status_code=204)
async def delete_quiz_question(
    question_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Delete a quiz question."""
    from app.models.quiz import QuizQuestion
    q = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return None

@router.put("/quiz-questions/{question_id}")
async def update_quiz_question(
    question_id: str,
    payload: dict,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Update a quiz question."""
    from app.models.quiz import QuizQuestion
    q = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if "question_text" in payload:
        q.question_text = payload["question_text"]
    if "options" in payload:
        q.options = payload["options"]
    if "correct_option_index" in payload:
        q.correct_option_index = payload["correct_option_index"]
    if "explanation" in payload:
        q.explanation = payload["explanation"]
        
    db.commit()
    db.refresh(q)
    return {
        "id": str(q.id),
        "lesson_id": str(q.lesson_id),
        "question_text": q.question_text,
        "options": q.options,
        "correct_option_index": q.correct_option_index,
        "explanation": q.explanation,
    }


# ═══════════════════════════════════════════════════════════════════════
#  ASSIGNMENTS
# ═══════════════════════════════════════════════════════════════════════

@router.post("/lessons/{lesson_id}/assignments")
async def add_assignment(
    lesson_id: str,
    payload: dict,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Add an assignment to a lesson the instructor owns."""
    from app.models.assignment import Assignment
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    section = db.query(Section).filter(Section.id == lesson.section_id).first()
    course = db.query(Course).filter(
        Course.id == section.course_id,
        Course.instructor_id == current_user.id
    ).first()
    if not course:
        raise HTTPException(status_code=403, detail="Not your course")

    a = Assignment(
        lesson_id=lesson_id,
        title=payload.get("title", ""),
        instructions=payload.get("instructions", ""),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": str(a.id), "lesson_id": str(a.lesson_id), "title": a.title, "instructions": a.instructions}


@router.get("/lessons/{lesson_id}/assignments")
async def list_assignments(
    lesson_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """List assignments for a lesson."""
    from app.models.assignment import Assignment
    assignments = db.query(Assignment).filter(Assignment.lesson_id == lesson_id).all()
    return [{"id": str(a.id), "lesson_id": str(a.lesson_id), "title": a.title, "instructions": a.instructions} for a in assignments]


@router.delete("/assignments/{assignment_id}", status_code=204)
async def delete_assignment(
    assignment_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Delete an assignment."""
    from app.models.assignment import Assignment
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(a)
    db.commit()
    return None

@router.put("/assignments/{assignment_id}")
async def update_assignment(
    assignment_id: str,
    payload: dict,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Update an assignment."""
    from app.models.assignment import Assignment
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if "title" in payload:
        a.title = payload["title"]
    if "instructions" in payload:
        a.instructions = payload["instructions"]
        
    db.commit()
    db.refresh(a)
    return {"id": str(a.id), "lesson_id": str(a.lesson_id), "title": a.title, "instructions": a.instructions}

# ═══════════════════════════════════════════════════════════════════════
#  PROFILE & PAYOUT
# ═══════════════════════════════════════════════════════════════════════

@router.get("/profile", response_model=UserRead)
async def get_instructor_profile(
    current_user: User = Depends(require_role("instructor")),
):
    """Get instructor profile including payout info."""
    return current_user

@router.put("/profile", response_model=UserRead)
async def update_instructor_profile(
    update_data: UserUpdate,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    """Update instructor profile and payout info."""
    if update_data.name is not None:
        current_user.name = update_data.name
    if update_data.bio is not None:
        current_user.bio = update_data.bio
    if update_data.profile_pic is not None:
        current_user.profile_pic = update_data.profile_pic
    if update_data.payout_account_name is not None:
        current_user.payout_account_name = update_data.payout_account_name
    if update_data.payout_account_number is not None:
        current_user.payout_account_number = update_data.payout_account_number
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/enrollments/{enrollment_id}/approve")
async def approve_enrollment(
    enrollment_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    from app.models.enrollment import Enrollment
    from datetime import datetime, timezone
    
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if not course or course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    enrollment.status = "approved"
    enrollment.approved_at = datetime.now(timezone.utc)
    enrollment.approved_by = current_user.id
    db.commit()
    return {"message": "Enrollment approved"}

@router.put("/enrollments/{enrollment_id}/reject")
async def reject_enrollment(
    enrollment_id: str,
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    from app.models.enrollment import Enrollment
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if not course or course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    enrollment.status = "rejected"
    db.commit()
    return {"message": "Enrollment rejected"}




@router.get("/my-assignments-quizzes")
def get_my_assignments_quizzes(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    from app.models.assignment import Assignment
    from app.models.quiz import QuizQuestion
    from app.models.assignment_submission import AssignmentSubmission
    from app.models.quiz_attempt import QuizAttempt
    from app.models.section import Section

    courses = db.query(Course).filter(Course.instructor_id == current_user.id).all()
    courses_data = []

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

    return courses_data
