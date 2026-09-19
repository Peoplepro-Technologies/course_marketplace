import sys
sys.path.append('backend')
from app.database import SessionLocal
try:
  from app.models.audit_log import AuditLog
  db = SessionLocal()
  logs = db.query(AuditLog).count()
  print('Audit Logs count:', logs)
except ImportError as e:
  print('ImportError:', e)
except Exception as e:
  print('ERROR:', e)
