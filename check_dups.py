import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.course import Course
from app.models.enrollment import Enrollment
db = SessionLocal()
courses = db.query(Course).all()
for c in courses: print(c.id, c.title)
enrolls = db.query(Enrollment).all()
print('Enrollments:', len(enrolls))
