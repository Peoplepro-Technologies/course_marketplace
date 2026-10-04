import urllib.request
import json
data = json.loads(urllib.request.urlopen('http://localhost:8000/api/v1/public/courses/491ffda1-4c32-48dd-9325-ec933d9908c8').read())
lessons = data['sections'][0]['lessons']
for idx, l in enumerate(lessons):
    print(f"Lesson {idx+1}: is_preview={l.get('is_preview')}, content={l.get('content')}, video={l.get('video_url')}")
