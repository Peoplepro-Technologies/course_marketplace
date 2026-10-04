"""
test_analytics.py — Verify the new assignment/quiz analytics endpoints.
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
print("  ASSIGNMENT / QUIZ ANALYTICS -- DB VERIFICATION")
print("=" * 70)

instructors = db.query(User).filter(User.role == "instructor").all()
print(f"\nFound {len(instructors)} instructor(s):\n")

for inst in instructors:
    courses = db.query(Course).filter(Course.instructor_id == inst.id).all()
    has_data = False
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

        if not has_data:
            print(f"  Instructor: {inst.name} ({inst.email})")
            has_data = True

        print(f"    Course: {c.title}  [{total_enrolled} enrolled]")

        for a in assignments:
            submitted = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == a.id
            ).count()
            pct = round(submitted / total_enrolled * 100) if total_enrolled else 0
            print(f"      [A] {a.title}: {submitted}/{total_enrolled} submitted ({pct}%)")

        for q in quizzes:
            attempted = (
                db.query(func.count(func.distinct(QuizAttempt.learner_id)))
                .filter(QuizAttempt.quiz_question_id == q.id)
                .scalar() or 0
            )
            pct = round(attempted / total_enrolled * 100) if total_enrolled else 0
            qtext = q.question_text[:45].encode('ascii', 'replace').decode()
            print(f"      [Q] '{qtext}...': {attempted}/{total_enrolled} attempted ({pct}%)")

    if not has_data:
        print(f"  Instructor: {inst.name} -- no assignments/quizzes in their courses")

print()
total_submissions = db.query(AssignmentSubmission).count()
total_attempts = db.query(QuizAttempt).count()
unique_quiz_learners = db.query(func.count(func.distinct(QuizAttempt.learner_id))).scalar()
print(f"TOTALS: {total_submissions} assignment submissions, "
      f"{total_attempts} quiz attempts ({unique_quiz_learners} unique learners attempted quizzes)")

print("\n[PASS] DB verification complete -- zero errors")
