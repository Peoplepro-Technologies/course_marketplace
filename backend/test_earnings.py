import requests
import json
import uuid

# We will just import the DB directly and check the logic to avoid auth overhead
from app.database import SessionLocal
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment

db = SessionLocal()
# Find an instructor
instructor = db.query(User).filter(User.role == 'instructor').first()
if not instructor:
    print("No instructor found")
    exit(1)

# print earnings logic
from collections import defaultdict
enrollments = (
    db.query(Enrollment, Course)
    .join(Course, Enrollment.course_id == Course.id)
    .filter(Course.instructor_id == instructor.id)
    .all()
)

total = 0
pending = 0
monthly = defaultdict(float)

for e, c in enrollments:
    price = float(c.price) if c.price else 0.0
    total += price
    if e.payout_status == "pending":
        pending += price
    if e.enrolled_at:
        m = e.enrolled_at.strftime("%b")
        monthly[m] += price

print(f"Instructor: {instructor.email}")
print(f"Total: {total}")
print(f"Pending: {pending}")
print(f"Monthly: {dict(monthly)}")
