"""
routers/transcripts.py — Endpoints for retrieving lesson and live class transcripts.

Protected by centralized access control (ensure_lesson_access and ensure_live_class_access).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.keycloak import get_current_user
from app.auth.access import ensure_lesson_access, ensure_live_class_access
from app.models.user import User
from app.models.lesson import Lesson
from app.models.live_class import LiveClass
from app.models.transcript import Transcript
from app.schemas.transcript import TranscriptRead

router = APIRouter(prefix="/api/v1/transcripts", tags=["Transcripts"])


@router.get("/lesson/{lesson_id}", response_model=TranscriptRead)
def get_lesson_transcript(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the transcript for a lesson.
    
    Access Control:
      - Preview lessons are accessible to any authenticated user.
      - Staff roles (super_admin, admin, sub_admin, course_coordinator) have full access.
      - The instructor who owns the course has access.
      - Enrolled learners with 'approved' status have access.
    """
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    ensure_lesson_access(current_user, lesson, db)

    transcript = db.query(Transcript).filter(Transcript.lesson_id == lesson.id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found for this lesson.")

    return TranscriptRead.model_validate(transcript)


@router.get("/live-class/{live_class_id}", response_model=TranscriptRead)
def get_live_class_transcript(
    live_class_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the transcript for a live class.
    
    Access Control:
      - Staff roles have full access.
      - The instructor who scheduled the live class has access.
      - Enrolled learners in the parent course with 'approved' status have access.
    """
    live_class = db.query(LiveClass).filter(LiveClass.id == live_class_id).first()
    if not live_class:
        raise HTTPException(status_code=404, detail="Live class not found")

    ensure_live_class_access(current_user, live_class, db)

    transcript = db.query(Transcript).filter(Transcript.live_class_id == live_class.id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found for this live class.")

    return TranscriptRead.model_validate(transcript)
