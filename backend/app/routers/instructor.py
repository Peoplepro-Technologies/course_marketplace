"""
routers/instructor.py — Endpoints for instructors.

Provides full CRUD for courses, sections, and lessons.
Instructors can only manage their own courses.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.schemas.course import CourseCreate, CourseUpdate, CourseRead
from app.schemas.section import SectionCreate, SectionUpdate, SectionRead
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonRead
from app.redis_client import invalidate_cache

router = APIRouter(prefix="/api/v1/instructor", tags=["Instructor"])


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

    if course.status == "draft":
        course.status = "published"
    elif course.status == "published":
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
