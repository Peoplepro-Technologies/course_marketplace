"""
utils/ffmpeg.py — Centralized FFmpeg binary discovery and media processing utilities.
"""

import os
import shutil
import subprocess
from app.config import get_settings


def get_ffmpeg_executable() -> str | None:
    """
    Locates the FFmpeg binary in the environment:
      1. Configured FFMPEG_PATH in settings (.env)
      2. System PATH via shutil.which("ffmpeg")
      3. Standard WinGet links directory
      4. Workspace root node_modules/ffmpeg-static fallback
    """
    settings = get_settings()

    # 1. Check configured FFMPEG_PATH in backend settings
    ffmpeg_setting = getattr(settings, "FFMPEG_PATH", None) or "ffmpeg"
    if os.path.isfile(ffmpeg_setting):
        return ffmpeg_setting
    elif os.path.isdir(ffmpeg_setting):
        candidate = os.path.join(ffmpeg_setting, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
        if os.path.isfile(candidate):
            return candidate
    else:
        which_result = shutil.which(ffmpeg_setting)
        if which_result:
            return which_result

    # 2. Check system PATH
    which_ffmpeg = shutil.which("ffmpeg")
    if which_ffmpeg:
        return which_ffmpeg

    # 3. Check standard Windows WinGet links folder
    links_ffmpeg = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe")
    if os.path.exists(links_ffmpeg):
        return links_ffmpeg

    # 4. Check workspace root node_modules fallback (ffmpeg-static)
    _HERE = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.normpath(os.path.join(_HERE, "..", "..", ".."))
    local_ffmpeg = os.path.normpath(
        os.path.join(workspace_root, "node_modules", "ffmpeg-static", "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    )
    if os.path.exists(local_ffmpeg):
        return local_ffmpeg

    return None


def run_ffmpeg_sync(cmd: list[str], timeout: int = 120) -> tuple[int, bytes, bytes]:
    """Execute an FFmpeg subprocess synchronously."""
    result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    return result.returncode, result.stdout, result.stderr


def extract_audio(video_path: str, output_audio_path: str, timeout: int = 120) -> bool:
    """
    Extracts 16kHz mono audio from a video file into a WAV format optimized for Whisper.
    """
    ffmpeg_bin = get_ffmpeg_executable()
    if not ffmpeg_bin:
        print("[FFMPEG] Error: FFmpeg binary not found for audio extraction.")
        return False

    cmd = [
        ffmpeg_bin, "-y",
        "-i", video_path,
        "-vn",                   # No video
        "-acodec", "pcm_s16le",  # Standard 16-bit PCM WAV
        "-ar", "16000",          # 16kHz sample rate required by Whisper
        "-ac", "1",              # Mono channel
        output_audio_path,
    ]

    try:
        rc, stdout, stderr = run_ffmpeg_sync(cmd, timeout=timeout)
        if rc != 0:
            print(f"[FFMPEG] Audio extraction failed (code {rc}): {stderr.decode(errors='replace')}")
            return False
        return True
    except Exception as e:
        print(f"[FFMPEG] Exception during audio extraction: {e}")
        return False
