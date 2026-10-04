import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.user import User
from datetime import datetime, timedelta, timezone
db = SessionLocal()
admin = db.query(User).filter(User.role=='admin').first()
if not admin:
  print('No admin found')
  sys.exit(1)
logs = [
  AuditLog(actor_user_id=admin.id, action='UPDATE_ROLE', target_type='User', target_id='some-id', details={'old':'learner','new':'instructor'}, timestamp=datetime.now(timezone.utc) - timedelta(days=1)),
  AuditLog(actor_user_id=admin.id, action='DELETE_COURSE', target_type='Course', target_id='course-123', details={'reason':'violation'}, timestamp=datetime.now(timezone.utc) - timedelta(hours=2)),
  AuditLog(actor_user_id=admin.id, action='APPROVE_COURSE', target_type='Course', target_id='course-456', details={}, timestamp=datetime.now(timezone.utc) - timedelta(minutes=15))
]
db.add_all(logs)
db.commit()
print('Seeded audit logs')
