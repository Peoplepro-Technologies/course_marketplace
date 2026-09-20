import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.course import Course
from app.models.user import User
from app.models.enrollment import Enrollment
db = SessionLocal()
learner = db.query(User).filter(User.role=='learner').first()
course = db.query(Course).first()
print('Learner:', learner.email)
print('Course:', course.title)
try:
  from app.routers.learner import enroll_in_course
  import asyncio
  res = asyncio.run(enroll_in_course(str(course.id), learner, db))
  print(res)
except Exception as e:
  print('ERROR:', e)
