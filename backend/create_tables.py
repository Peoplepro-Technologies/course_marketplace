from sqlalchemy import create_engine
from app.database import Base
from app.models.quiz import QuizQuestion
from app.models.assignment import Assignment
from app.models.__init__ import *

engine = create_engine("postgresql://postgres:manasvi@localhost:5432/course_marketplace")
Base.metadata.create_all(bind=engine)
print("Tables created successfully.")
