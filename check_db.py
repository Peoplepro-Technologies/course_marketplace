import sys
sys.path.append('backend')
from app.database import engine
from sqlalchemy import text
conn = engine.connect()
res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'")).fetchall()
print(res)
