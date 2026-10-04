import sys

def patch_coordinator():
    path = r"C:\course_marketplace\backend\app\routers\coordinator.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_endpoint = """

@router.get("/faculty-assignments-quizzes")
def get_faculty_assignments_quizzes(
    current_user: User = Depends(require_role("coursecoordinator")),
    db: Session = Depends(get_db),
):
    from app.models.assignment import Assignment
    from app.models.quiz import QuizQuestion
    from app.models.assignment_submission import AssignmentSubmission
    from app.models.quiz_attempt import QuizAttempt
    from app.models.lesson import Lesson

    instructors = db.query(User).filter(User.role == "instructor").all()
    results = []

    for inst in instructors:
        courses_data = []
        courses = db.query(Course).filter(Course.instructor_id == inst.id).all()
        for c in courses:
            total_enrolled = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()

            # Assignments
            assignments = (
                db.query(Assignment)
                .join(Lesson, Assignment.lesson_id == Lesson.id)
                .join(Section, Lesson.section_id == Section.id)
                .filter(Section.course_id == c.id)
                .all()
            )
            assign_data = []
            for a in assignments:
                submitted = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).count()
                assign_data.append({
                    "title": a.title,
                    "total_enrolled": total_enrolled,
                    "submitted": submitted
                })

            # Quizzes
            quizzes = (
                db.query(QuizQuestion)
                .join(Lesson, QuizQuestion.lesson_id == Lesson.id)
                .join(Section, Lesson.section_id == Section.id)
                .filter(Section.course_id == c.id)
                .all()
            )
            quiz_data = []
            for q in quizzes:
                attempted = db.query(func.count(func.distinct(QuizAttempt.learner_id))).filter(QuizAttempt.quiz_question_id == q.id).scalar() or 0
                quiz_data.append({
                    "title": q.question_text[:50] + ("..." if len(q.question_text) > 50 else ""),
                    "total_enrolled": total_enrolled,
                    "attempted": attempted
                })

            if assign_data or quiz_data:
                courses_data.append({
                    "course_title": c.title,
                    "assignments": assign_data,
                    "quizzes": quiz_data
                })
        
        if courses_data:
            results.append({
                "instructor_name": inst.name,
                "courses": courses_data
            })

    return results
"""
    if "def get_faculty_assignments_quizzes" not in content:
        content += new_endpoint
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

def patch_instructor():
    path = r"C:\course_marketplace\backend\app\routers\instructor.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_endpoint = """

@router.get("/my-assignments-quizzes")
def get_my_assignments_quizzes(
    current_user: User = Depends(require_role("instructor")),
    db: Session = Depends(get_db),
):
    from app.models.assignment import Assignment
    from app.models.quiz import QuizQuestion
    from app.models.assignment_submission import AssignmentSubmission
    from app.models.quiz_attempt import QuizAttempt
    from app.models.section import Section

    courses = db.query(Course).filter(Course.instructor_id == current_user.id).all()
    courses_data = []

    for c in courses:
        total_enrolled = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()

        # Assignments
        assignments = (
            db.query(Assignment)
            .join(Lesson, Assignment.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .filter(Section.course_id == c.id)
            .all()
        )
        assign_data = []
        for a in assignments:
            submitted = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).count()
            assign_data.append({
                "title": a.title,
                "total_enrolled": total_enrolled,
                "submitted": submitted
            })

        # Quizzes
        quizzes = (
            db.query(QuizQuestion)
            .join(Lesson, QuizQuestion.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .filter(Section.course_id == c.id)
            .all()
        )
        quiz_data = []
        for q in quizzes:
            attempted = db.query(func.count(func.distinct(QuizAttempt.learner_id))).filter(QuizAttempt.quiz_question_id == q.id).scalar() or 0
            quiz_data.append({
                "title": q.question_text[:50] + ("..." if len(q.question_text) > 50 else ""),
                "total_enrolled": total_enrolled,
                "attempted": attempted
            })

        if assign_data or quiz_data:
            courses_data.append({
                "course_title": c.title,
                "assignments": assign_data,
                "quizzes": quiz_data
            })

    return courses_data
"""
    if "def get_my_assignments_quizzes" not in content:
        content += new_endpoint
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

patch_coordinator()
patch_instructor()
