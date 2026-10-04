"""
workers/tasks.py — Background tasks for async processing.

These functions are invoked via FastAPI's BackgroundTasks and run
after the HTTP response has been sent to the client.
"""

from sqlalchemy import func
from app.database import SessionLocal
from app.models.review import Review
from app.models.course import Course


def recalculate_course_rating(course_id: str):
    """
    Recalculate and update the average rating for a course.

    This runs as a background task after a review is submitted.
    It averages all 'active' reviews and stores the result on the
    Course.avg_rating column.

    Args:
        course_id: UUID string of the course to recalculate.
    """
    db = SessionLocal()
    try:
        # Calculate the average of all active reviews for this course
        avg = (
            db.query(func.avg(Review.rating))
            .filter(
                Review.course_id == course_id,
                Review.status == "active",
            )
            .scalar()
        )

        # Update the course's cached average rating
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            course.avg_rating = round(float(avg), 2) if avg else 0.0
            db.commit()
            print(f"[Background] Updated avg_rating for course {course_id}: {course.avg_rating}")
    except Exception as e:
        print(f"[Background] Error recalculating rating for course {course_id}: {e}")
        db.rollback()
    finally:
        db.close()
