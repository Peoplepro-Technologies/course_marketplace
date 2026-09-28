from sqlalchemy import create_engine, text
engine = create_engine("postgresql://postgres:manasvi@localhost:5432/course_marketplace")

with engine.connect() as conn:
    print("=== 1. PREVIEW LESSONS WITH VIDEO_URL ===")
    rows = conn.execute(text("""
        SELECT c.title, l.id::text, l.title as lesson_title, l.is_preview, 
               CASE WHEN l.video_url IS NOT NULL THEN LEFT(l.video_url, 60) ELSE 'NULL' END as video_url
        FROM lessons l
        JOIN sections s ON l.section_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE l.is_preview = true
        ORDER BY c.title
    """)).fetchall()
    if rows:
        for r in rows:
            print(f"  Course: {r[0][:40]}")
            print(f"  Lesson ID: {r[1]}")
            print(f"  Lesson: {r[2]}")
            print(f"  video_url: {r[4]}")
            print()
    else:
        print("  NO LESSONS HAVE is_preview=true!")
    
    print("=== 2. QUIZ QUESTIONS IN DB ===")
    rows = conn.execute(text("""
        SELECT qq.lesson_id::text, l.title as lesson_title, qq.question_text
        FROM quiz_questions qq
        JOIN lessons l ON qq.lesson_id = l.id
        ORDER BY l.title
    """)).fetchall()
    print(f"  Total quiz questions: {len(rows)}")
    for r in rows:
        print(f"  lesson_id={r[0]} | {r[1][:40]} | Q: {r[2][:50]}")
    
    print()
    print("=== 3. ASSIGNMENTS IN DB ===")
    rows = conn.execute(text("""
        SELECT a.lesson_id::text, l.title as lesson_title, a.title
        FROM assignments a
        JOIN lessons l ON a.lesson_id = l.id
        ORDER BY l.title
    """)).fetchall()
    print(f"  Total assignments: {len(rows)}")
    for r in rows:
        print(f"  lesson_id={r[0]} | {r[1][:40]} | {r[2]}")
    
    print()
    print("=== 4. ENROLLMENT STATUS & FLOW ===")
    rows = conn.execute(text("""
        SELECT e.status, COUNT(*) as count
        FROM enrollments e
        GROUP BY e.status
    """)).fetchall()
    for r in rows:
        print(f"  Status '{r[0]}': {r[1]} enrollments")
    
    print()
    print("=== Sample enrollment ===")
    rows = conn.execute(text("""
        SELECT e.id::text, e.status, e.learner_id::text, e.course_id::text
        FROM enrollments e
        LIMIT 3
    """)).fetchall()
    for r in rows:
        print(f"  enrollment_id={r[0]} status={r[1]}")
