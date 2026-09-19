from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.transaction import Transaction

engine = create_engine("postgresql://postgres:manasvi@localhost:5432/course_marketplace")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()
    enrollments = db.query(Enrollment).all()
    count = 0
    for enr in enrollments:
        # Check if transaction exists
        existing = db.query(Transaction).filter_by(learner_id=enr.learner_id, course_id=enr.course_id).first()
        if not existing:
            course = db.query(Course).filter_by(id=enr.course_id).first()
            if course and course.price > 0:
                t = Transaction(
                    learner_id=enr.learner_id,
                    course_id=enr.course_id,
                    amount=course.price,
                    status="completed",
                    payment_method="mock"
                )
                db.add(t)
                count += 1
    db.commit()
    print(f"Created {count} transactions.")

if __name__ == "__main__":
    main()
