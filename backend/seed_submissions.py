from app.database import SessionLocal
from app.models.user import User
from app.models.assignment import Assignment
from app.models.quiz import QuizQuestion
from app.models.assignment_submission import AssignmentSubmission
from app.models.quiz_attempt import QuizAttempt
import random

db = SessionLocal()

learners = db.query(User).filter(User.role == 'learner').all()
assignments = db.query(Assignment).all()
quizzes = db.query(QuizQuestion).all()

if learners:
    print(f"Found {len(learners)} learners. Seeding submissions...")
    
    # Assignment submissions
    added_assignments = 0
    for assignment in assignments:
        for learner in learners:
            if random.random() > 0.5:
                existing = db.query(AssignmentSubmission).filter_by(assignment_id=assignment.id, learner_id=learner.id).first()
                if not existing:
                    sub = AssignmentSubmission(assignment_id=assignment.id, learner_id=learner.id, content="My submission")
                    db.add(sub)
                    added_assignments += 1

    # Quiz attempts
    added_quizzes = 0
    for quiz in quizzes:
        for learner in learners:
            if random.random() > 0.5:
                existing = db.query(QuizAttempt).filter_by(quiz_question_id=quiz.id, learner_id=learner.id).first()
                if not existing:
                    att = QuizAttempt(quiz_question_id=quiz.id, learner_id=learner.id, selected_option_index=1, is_correct=True)
                    db.add(att)
                    added_quizzes += 1

    db.commit()
    print(f"Added {added_assignments} assignment submissions and {added_quizzes} quiz attempts.")
else:
    print("No learners found. Seeding is skipped.")
