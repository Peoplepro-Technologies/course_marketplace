import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.transcription import parse_pasted_transcript

def main():
    parser = argparse.ArgumentParser(description="Parse and save manually pasted YouTube transcript.")
    parser.add_argument("lesson_id", help="The UUID of the lesson to attach the transcript to.")
    parser.add_argument("file_path", help="Path to a text file containing the raw copied transcript.")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.file_path):
        print(f"Error: File not found - {args.file_path}")
        sys.exit(1)
        
    with open(args.file_path, "r", encoding="utf-8") as f:
        raw_text = f.read()
        
    try:
        parse_pasted_transcript(args.lesson_id, raw_text)
        print("Success! Transcript parsed and saved.")
    except Exception as e:
        print(f"Failed to parse and save transcript: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
