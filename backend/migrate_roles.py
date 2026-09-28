from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
try:
    admins = db.query(User).filter(User.role == 'admin').all()
    count = len(admins)
    for admin in admins:
        admin.role = 'super_admin'
    db.commit()
    print(f'MIGRATION SUCCESS: Updated {count} users from admin to super_admin.')
    
    # Verification query
    remaining = db.query(User).filter(User.role == 'admin').count()
    print(f'VERIFICATION: {remaining} rows with role="admin" remaining.')
except Exception as e:
    print(f'ERROR: {e}')
finally:
    db.close()
