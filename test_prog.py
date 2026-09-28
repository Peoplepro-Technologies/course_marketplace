import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.user import User
from app.models.lesson import Lesson
db = SessionLocal()
learner = db.query(User).filter(User.role=='learner').first()
lesson = db.query(Lesson).first()
try:
  from app.routers.learner import update_progress
  from app.schemas.progress import ProgressUpdate
  import asyncio
  data = ProgressUpdate(lesson_id=str(lesson.id), status='completed')
  res = asyncio.run(update_progress(data, learner, db))
  print(res)
except Exception as e:
  print('ERROR:', e)
