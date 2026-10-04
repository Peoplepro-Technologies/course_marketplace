"""
test_analytics_fix.py — Verify the before/after numbers for assignments/quizzes
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, r"C:\course_marketplace\backend")

from app.database import SessionLocal
from app.models.user import User
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.models.assignment import Assignment
from app.models.quiz import QuizQuestion
from app.models.assignment_submission import AssignmentSubmission
from app.models.quiz_attempt import QuizAttempt
from app.models.enrollment import Enrollment
from sqlalchemy import func

db = SessionLocal()

print("=" * 70)
print("  BEFORE / AFTER COMPARISON")
print("=" * 70)

instructors = db.query(User).filter(User.name == "instructor  testing").all()

for inst in instructors:
    courses = db.query(Course).filter(Course.instructor_id == inst.id).all()
    for c in courses:
        total_enrolled = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()

        assignments = (
            db.query(Assignment)
            .join(Lesson, Assignment.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .filter(Section.course_id == c.id)
            .all()
        )
        quizzes = (
            db.query(QuizQuestion)
            .join(Lesson, QuizQuestion.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .filter(Section.course_id == c.id)
            .all()
        )

        if not assignments and not quizzes:
            continue

        print(f"\nCourse: {c.title}  [Enrolled: {total_enrolled}]")

        for a in assignments:
            # BEFORE (total rows)
            submitted_before = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == a.id
            ).count()
            
            # AFTER (distinct learners, capped)
            submitted_distinct = db.query(func.count(func.distinct(AssignmentSubmission.learner_id))).filter(
                AssignmentSubmission.assignment_id == a.id
            ).scalar() or 0
            submitted_after = min(submitted_distinct, total_enrolled)
            
            print(f"  [A] {a.title}:")
            print(f"      Before: {submitted_before}/{total_enrolled}")
            print(f"      After:  {submitted_after}/{total_enrolled}")
            if submitted_distinct > total_enrolled:
                print(f"      [!] WARNING: Distinct submitters ({submitted_distinct}) exceeded enrolled ({total_enrolled})")

        for q in quizzes:
            # BEFORE (what was reported before, maybe counting attempts wrong?)
            # Wait, quizzes were already using distinct learner_id in my code before.
            # But the user reported "3/1" for final demo.
            attempted_before = db.query(func.count(func.distinct(QuizAttempt.learner_id))).filter(
                QuizAttempt.quiz_question_id == q.id
            ).scalar() or 0
            
            # AFTER (capped)
            attempted_after = min(attempted_before, total_enrolled)

            qtext = q.question_text[:45].encode('ascii', 'replace').decode()
            print(f"  [Q] {qtext}...:")
            print(f"      Before: {attempted_before}/{total_enrolled}")
            print(f"      After:  {attempted_after}/{total_enrolled}")
            if attempted_before > total_enrolled:
                print(f"      [!] WARNING: Distinct attempters ({attempted_before}) exceeded enrolled ({total_enrolled})")

print("\nDone.")
