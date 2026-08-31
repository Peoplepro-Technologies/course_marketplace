"""
models/__init__.py — Import all models so Alembic and Base.metadata see them.
"""

from app.models.user import User
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.review import Review
from app.models.category import Category
from app.models.audit_log import AuditLog
from app.models.wishlist import Wishlist
from app.models.refund_request import RefundRequest
from app.models.instructor_payout import InstructorPayout
from app.models.transaction import Transaction
from app.models.live_class import LiveClass
from app.models.transcript import Transcript

__all__ = [
    "User",
    "Course",
    "Section",
    "Lesson",
    "Enrollment",
    "Progress",
    "Review",
    "Category",
    "AuditLog",
    "Wishlist",
    "RefundRequest",
    "InstructorPayout",
    "Transaction",
    "LiveClass",
    "Transcript",
]
