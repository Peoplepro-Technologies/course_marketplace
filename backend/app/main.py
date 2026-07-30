"""
main.py — FastAPI application entry point.

Sets up:
  - CORS middleware (allows the Vite frontend at localhost:5173)
  - All API routers (public, learner, instructor, admin)
  - Static file serving for uploaded media (videos, thumbnails)
  - Database table creation on startup
  - Auto-generated OpenAPI docs at /docs
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.models import *  # noqa: F401, F403 — ensures all models are registered
from app.routers import public, learner, instructor, admin

# ── Media directory paths ─────────────────────────────────────────────
# Resolve relative to this file so it works from any working directory.
_HERE = os.path.dirname(os.path.abspath(__file__))
MEDIA_ROOT = os.path.join(_HERE, "media")
os.makedirs(os.path.join(MEDIA_ROOT, "videos"), exist_ok=True)
os.makedirs(os.path.join(MEDIA_ROOT, "thumbnails"), exist_ok=True)


# ── Lifespan: runs on startup / shutdown ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: create database tables if they don't exist.
    In production you'd rely solely on Alembic, but this is
    convenient for local development.
    """
    print("Starting Course Marketplace API...")
    Base.metadata.create_all(bind=engine)
    print("Database tables verified/created.")
    yield
    print("Shutting down Course Marketplace API.")


# ── FastAPI App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Course Marketplace API",
    description=(
        "Self-hosted online course marketplace backend. "
        "Provides course catalog, enrollment, progress tracking, "
        "reviews, and admin moderation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
# Allow the Vite dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving for uploaded media ────────────────────────────
# Only mount thumbnails publicly. Videos are served securely via a custom endpoint.
app.mount("/media/thumbnails", StaticFiles(directory=os.path.join(MEDIA_ROOT, "thumbnails")), name="thumbnails")

# ── Routers ───────────────────────────────────────────────────────────
app.include_router(public.router)
app.include_router(learner.router)
app.include_router(instructor.router)
app.include_router(admin.router)


# ── Health Check ──────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def health_check():
    """Simple health check endpoint."""
    return {
        "status": "healthy",
        "service": "Course Marketplace API",
        "version": "1.0.0",
    }
