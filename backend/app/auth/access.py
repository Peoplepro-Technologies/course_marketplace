"""
auth/access.py — Centralized authorization checks for courses, lessons, and live classes.

Ensures consistent access rules for:
  - Lessons (video streaming, content, and transcripts)
  - Live classes (join info and transcripts)
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.lesson import Lesson
from app.models.section import Section
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.live_class import LiveClass

STAFF_ROLES = {"super_admin", "admin", "sub_admin", "course_coordinator"}


def can_access_lesson(user: User, lesson: Lesson, db: Session) -> bool:
    """
    Checks if a user has access to a lesson's full content/video/transcript.
    Access is granted if:
      1. The lesson is flagged as a free preview (is_preview=True)
      2. The user has an administrative/staff role
      3. The user is the instructor who owns the course
      4. The user is an enrolled learner with status == "approved"
    """
    if lesson.is_preview:
        return True

    roles = set(getattr(user, "_realm_roles", []))
    if roles & STAFF_ROLES:
        return True

    section = db.query(Section).filter(Section.id == lesson.section_id).first()
    if not section:
        return False

    course = db.query(Course).filter(Course.id == section.course_id).first()
    if not course:
        return False

    if "instructor" in roles and course.instructor_id == user.id:
        return True

    enrollment = db.query(Enrollment).filter(
        Enrollment.learner_id == user.id,
        Enrollment.course_id == course.id,
        Enrollment.status == "approved",
    ).first()
    return enrollment is not None


def ensure_lesson_access(user: User, lesson: Lesson, db: Session) -> None:
    """Raises HTTP 403 if the user does not have permission to access the lesson."""
    if not can_access_lesson(user, lesson, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this lesson content.",
        )


def can_access_live_class(user: User, live_class: LiveClass, db: Session) -> bool:
    """
    Checks if a user has access to join or view a live class.
    Access is granted if:
      1. The user has an administrative/staff role
      2. The user is the instructor who created the live class
      3. The user is an enrolled learner in the parent course with status == "approved"
    """
    roles = set(getattr(user, "_realm_roles", []))
    if roles & STAFF_ROLES:
        return True

    if "instructor" in roles and live_class.instructor_id == user.id:
        return True

    enrollment = db.query(Enrollment).filter(
        Enrollment.learner_id == user.id,
        Enrollment.course_id == live_class.course_id,
        Enrollment.status == "approved",
    ).first()
    return enrollment is not None


def ensure_live_class_access(user: User, live_class: LiveClass, db: Session) -> None:
    """Raises HTTP 403 if the user does not have permission to access the live class."""
    if not can_access_live_class(user, live_class, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this live class.",
        )
