import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.course import Course
from app.models.enrollment import Enrollment
db = SessionLocal()
seen = set()
courses = db.query(Course).all()
for c in courses:
  if c.title in seen:
    print(f'Deleting duplicate course: {c.title} ({c.id})')
    db.delete(c)
  else:
    seen.add(c.title)
db.commit()
print('Done.')
