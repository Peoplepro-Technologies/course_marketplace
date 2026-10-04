"""
services/transcription.py — Video and audio transcription using faster-whisper.

Runs asynchronously via FastAPI BackgroundTasks after a lesson video is uploaded.
"""

import os
import uuid
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.transcript import Transcript
import re
from app.utils.ffmpeg import extract_audio


def get_youtube_id(url: str) -> str:
    if not url: return None
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{11})'
    ]
    for p in patterns:
        m = re.search(p, url)
        if m: return m.group(1)
    return None

def parse_pasted_transcript(lesson_id: str, raw_text: str) -> None:
    """
    Parses manually pasted transcript text from YouTube and saves it as segments.
    The raw_text format can be:
    - Alternating lines of timestamps (M:SS) and text
    - Timestamps with text on the same line like: 0:000 secondsTEXT
    - Markdown links like: [00:00](https://youtube.com/...) TEXT
    """
    db = SessionLocal()
    try:
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        
        segments = []
        full_text_parts = []
        current_time_str = None
        current_text = []
        
        # Regex to match timestamps like "0:04", "1:23", "01:05:22"
        # Also handles "[00:00](url) Text" and "0:000 secondsText"
        time_pattern = re.compile(
            r'^\[?(\d{1,2}:(?:[0-5]\d:)?[0-5]\d)\]?(?:\(https?://[^\)]+\))?(?:\d*\s*(?:seconds?|minutes?(?:,\s*\d+\s*seconds?)?))?\s*(.*)$'
        )
        
        def time_to_seconds(t_str: str) -> float:
            parts = t_str.split(':')
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            return 0.0

        def save_current_segment():
            if current_time_str is not None and current_text:
                start_sec = time_to_seconds(current_time_str)
                joined_text = " ".join(current_text).strip()
                if joined_text:
                    segments.append({
                        "start": start_sec,
                        "text": joined_text
                    })
                    full_text_parts.append(joined_text)

        for line in lines:
            m = time_pattern.match(line)
            if m:
                # We found a timestamp!
                save_current_segment()
                
                # Start new segment
                current_time_str = m.group(1)
                current_text = []
                
                # If there is text on the same line, add it
                inline_text = m.group(2).strip()
                if inline_text:
                    current_text.append(inline_text)
            else:
                # Accumulate text for the current segment
                if current_time_str is not None:
                    current_text.append(line)
                    
        # Don't forget the last segment
        save_current_segment()
            
        # Calculate end times for segments based on the next segment's start time
        for i in range(len(segments)):
            if i < len(segments) - 1:
                segments[i]['end'] = segments[i+1]['start']
            else:
                # For the last segment, assume it lasts a bit longer (e.g., 5 seconds)
                segments[i]['end'] = segments[i]['start'] + 5.0
                
        # Save to DB
        transcript = db.query(Transcript).filter(Transcript.lesson_id == lesson_id).first()
        if not transcript:
            transcript = Transcript(
                lesson_id=lesson_id,
                source_type="lesson",
                whisper_model="manual-paste",
            )
            db.add(transcript)
            
        transcript.full_text = " ".join(full_text_parts)
        transcript.segments = segments
        transcript.language = "en"
        transcript.duration_seconds = segments[-1]['end'] if segments else 0
        transcript.status = "completed"
        transcript.error_message = None
        transcript.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        print(f"[TRANSCRIPTION] Manually pasted transcript saved for lesson_id={lesson_id}.")
        
    except Exception as e:
        import traceback
        print(f"[TRANSCRIPTION] Error parsing pasted transcript for lesson_id={lesson_id}: {e}")
        print(traceback.format_exc())
        db.rollback()
        raise e
    finally:
        db.close()
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
