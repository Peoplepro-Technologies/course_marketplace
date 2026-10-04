"""
database.py — SQLAlchemy engine, session factory, and declarative Base.

All models inherit from Base.  Use get_db() as a FastAPI dependency to
obtain a scoped database session that auto-closes after the request.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import get_settings

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────
# pool_pre_ping=True ensures stale connections are recycled automatically.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,  # Set to True for SQL debugging
)

# ── Session Factory ───────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Declarative Base ──────────────────────────────────────────────────
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a database session.
    The session is committed automatically on success and closed on exit.

    Usage:
        @router.get("/items")
        def list_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
