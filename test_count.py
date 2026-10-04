import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.user import User
from app.models.lesson import Lesson
from app.models.section import Section
from app.models.progress import Progress
db = SessionLocal()
learner = db.query(User).filter(User.role=='learner').first()
lesson = db.query(Lesson).first()
course_id = db.query(Section).filter(Section.id==lesson.section_id).first().course_id
count = db.query(Progress).join(Lesson).join(Section).filter(Section.course_id==course_id, Progress.learner_id==learner.id, Progress.status=='completed').count()
print('Completed lessons:', count)
