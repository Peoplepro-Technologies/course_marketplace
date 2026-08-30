from app.config import get_settings
from sqlalchemy import create_engine, text
engine = create_engine(get_settings().DATABASE_URL)
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories'")).fetchall()
    print("CATEGORIES TABLE COLUMNS:", res)
