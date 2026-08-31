"""
services/transcription.py — Video and audio transcription using faster-whisper.

Runs asynchronously via FastAPI BackgroundTasks after a lesson video is uploaded.
"""

import os
import uuid
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.transcript import Transcript
from app.utils.ffmpeg import extract_audio


def transcribe_lesson_video(lesson_id: str, video_path: str) -> None:
    """
    Background worker function that extracts audio from an uploaded lesson video
    and runs faster-whisper speech-to-text inference.
    """
    print(f"\n[TRANSCRIPTION] Starting transcription for lesson_id={lesson_id}")
    db = SessionLocal()
    temp_audio_path = os.path.join(
        os.path.dirname(video_path),
        f"{lesson_id}_{uuid.uuid4().hex[:8]}_audio.wav"
    )

    try:
        # 1. Fetch or create the Transcript row
        transcript = db.query(Transcript).filter(Transcript.lesson_id == lesson_id).first()
        if not transcript:
            transcript = Transcript(
                lesson_id=lesson_id,
                source_type="lesson",
                whisper_model="base",
                status="processing",
            )
            db.add(transcript)
        else:
            transcript.status = "processing"
            transcript.error_message = None
        db.commit()
        db.refresh(transcript)

        # 2. Extract 16kHz mono WAV audio
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at {video_path}")

        extracted = extract_audio(video_path, temp_audio_path)
        if not extracted or not os.path.exists(temp_audio_path):
            raise RuntimeError("FFmpeg audio extraction failed.")

        # 3. Run faster-whisper model on CPU (INT8 quantized for speed & low memory)
        from faster_whisper import WhisperModel
        print(f"[TRANSCRIPTION] Loading faster-whisper base model...")
        model = WhisperModel("base", device="cpu", compute_type="int8")

        print(f"[TRANSCRIPTION] Transcribing audio from {temp_audio_path}...")
        segments_gen, info = model.transcribe(temp_audio_path, beam_size=5)

        collected_segments = []
        full_text_parts = []

        for segment in segments_gen:
            text = segment.text.strip()
            if text:
                collected_segments.append({
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": text,
                })
                full_text_parts.append(text)

        # 4. Save results to database
        transcript.full_text = " ".join(full_text_parts)
        transcript.segments = collected_segments
        transcript.language = info.language or "en"
        transcript.duration_seconds = round(info.duration, 2) if info.duration else None
        transcript.status = "completed"
        transcript.error_message = None
        transcript.updated_at = datetime.now(timezone.utc)
        db.commit()

        print(f"[TRANSCRIPTION] Completed successfully for lesson_id={lesson_id}. (Lang: {transcript.language}, Duration: {transcript.duration_seconds}s)")

    except Exception as exc:
        import traceback
        print(f"[TRANSCRIPTION] Error transcribing lesson_id={lesson_id}: {exc}")
        print(traceback.format_exc())
        try:
            transcript = db.query(Transcript).filter(Transcript.lesson_id == lesson_id).first()
            if transcript:
                transcript.status = "failed"
                transcript.error_message = str(exc)
                transcript.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception as db_err:
            print(f"[TRANSCRIPTION] Failed to update error status in DB: {db_err}")
    finally:
        # Always clean up the temporary audio file
        if os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except OSError:
                pass
        db.close()
