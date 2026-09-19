import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.user import User
db = SessionLocal()
learner = db.query(User).filter(User.role=='learner').first()
try:
  from app.routers.learner import list_enrolled_courses
  import asyncio
  res = asyncio.run(list_enrolled_courses(learner, db))
  print(res)
except Exception as e:
  print('ERROR:', e)
