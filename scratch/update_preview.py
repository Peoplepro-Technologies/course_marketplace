import os
import sys

# Remove problem env vars before pydantic parses them
for k in ['KEYCLOAK_ADMIN', 'KEYCLOAK_ADMIN_PASSWORD', 'PYTHONIOENCODING', 'FFMPEG_BIN_PATH', 'KEYCLOAK_BIN_PATH']:
    if k in os.environ:
        del os.environ[k]

sys.path.append('backend')
from app.database import SessionLocal
from app.models.lesson import Lesson
db = SessionLocal()
lesson = db.query(Lesson).first()
if lesson:
    lesson.is_preview = True
    lesson.content = 'Hello preview!'
    lesson.video_url = '/media/videos/test.mp4'
    db.commit()
    print('Updated lesson:', lesson.id)
else:
    print('No lessons')
