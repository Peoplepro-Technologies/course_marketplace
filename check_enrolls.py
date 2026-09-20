import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.enrollment import Enrollment
db = SessionLocal()
recent = db.query(Enrollment).order_by(Enrollment.enrolled_at.desc()).limit(5).all()
for e in recent:
  print(f'Learner: {e.learner_id}, Course: {e.course_id}, Status: {e.status}, Time: {e.enrolled_at}')
