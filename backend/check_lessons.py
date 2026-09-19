from sqlalchemy import create_engine, text
engine = create_engine("postgresql://postgres:manasvi@localhost:5432/course_marketplace")
with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT c.title as course_title, s.title as section_title, l.id::text, l.title as lesson_title
        FROM lessons l
        JOIN sections s ON l.section_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE c.id IN (
            'bcee44b0-d280-431a-a147-5162d32c936d',
            '9fe1f958-119a-467a-8f27-46238d894900',
            '18744bf4-728d-43f5-832a-b4d4a0d0b1c2',
            '64e2574e-524a-4175-bf59-aff3714be890',
            '950e520e-2910-406d-afb0-2ddf83862f4d',
            '3f0f61e7-d77e-41de-b07a-75ede106d4f7'
        )
        ORDER BY c.title, s.order_index, l.order_index
    """)).fetchall()
    for r in rows:
        print(r[0][:35], "|", r[1][:35], "|", r[2], "|", r[3])
