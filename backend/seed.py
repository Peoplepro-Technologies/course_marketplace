import sys
import uuid
import random
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.user import User
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.models.review import Review
from app.models.enrollment import Enrollment

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def main():
    db: Session = next(get_db())
    
    print("Deleting existing courses...")
    db.query(Course).delete()
    db.commit()
    print("Deleted all existing courses.")

    # Create users
    print("Creating instructors and learners...")
    instructors = []
    learners = []
    
    for i in range(3):
        key = str(uuid.uuid4())
        instructor = User(
            keycloak_sub=f"inst_seed_{key}",
            name=f"Instructor {i+1}",
            email=f"inst{i+1}@test.com",
            role="instructor",
            bio="Experienced professional and educator."
        )
        db.add(instructor)
        instructors.append(instructor)
        
    for i in range(5):
        key = str(uuid.uuid4())
        learner = User(
            keycloak_sub=f"learner_seed_{key}",
            name=f"Learner {i+1}",
            email=f"learner{i+1}@test.com",
            role="learner",
        )
        db.add(learner)
        learners.append(learner)
        
    db.commit()
    
    print("Seeding courses...")
    
    # COURSE 1
    c1 = Course(
        title="Data Analyst Bootcamp: Excel, SQL, Python & Power BI",
        description="A comprehensive, job-oriented data analyst course covering Excel, SQL, Python, data visualization, statistics, and Power BI — everything needed to start a career in data analytics.",
        category="Data & Analytics",
        price=2999.0,
        thumbnail_url="https://img.youtube.com/vi/Zr0sNpeClV4/hqdefault.jpg",
        status="published",
        instructor_id=instructors[0].id,
        avg_rating=4.8
    )
    db.add(c1)
    db.flush()
    
    s1_1 = Section(course_id=c1.id, title="Microsoft Excel for Data Analysis", order_index=1)
    db.add(s1_1)
    db.flush()
    db.add(Lesson(section_id=s1_1.id, title="Complete MS Excel Course for Data Analysts", video_url="https://www.youtube.com/watch?v=Zr0sNpeClV4", is_preview=True, duration=355, order_index=1, content="This comprehensive video covers everything you need to know about Microsoft Excel for Data Analysis. We start with the absolute basics of spreadsheet navigation and formulas, and quickly progress into data cleaning, PivotTables, VLOOKUP, XLOOKUP, and building interactive dashboards. Ideal for beginners and intermediate users looking to solidify their analytical skills in Excel."))
    
    s1_2 = Section(course_id=c1.id, title="SQL for Data Analytics", order_index=2)
    db.add(s1_2)
    db.flush()
    db.add(Lesson(section_id=s1_2.id, title="Complete SQL in One Shot for Data Analytics", video_url="https://www.youtube.com/watch?v=p1epCuYb5OQ", duration=240, order_index=1, content="SQL is the most important skill for a Data Analyst. This lesson covers relational database concepts, basic SELECT queries, filtering, aggregations (GROUP BY), JOINS (Inner, Left, Right), subqueries, and window functions. By the end of this video, you will be able to extract and manipulate data efficiently using SQL."))
    
    s1_3 = Section(course_id=c1.id, title="Python Programming", order_index=3)
    db.add(s1_3)
    db.flush()
    db.add(Lesson(section_id=s1_3.id, title="Python Full Course: Beginner to Advanced", video_url="https://www.youtube.com/watch?v=_aWbUudZ5Yo", duration=300, order_index=1, content="Master Python from scratch! This lesson introduces Python programming fundamentals: variables, data types, loops, conditional statements, functions, and object-oriented programming. We also cover file handling and error handling to prepare you for data science applications."))
    
    s1_4 = Section(course_id=c1.id, title="Data Science Foundations", order_index=4)
    db.add(s1_4)
    db.flush()
    db.add(Lesson(section_id=s1_4.id, title="Data Science with NumPy", video_url="https://www.youtube.com/watch?v=Utgwk0r9Zq4", duration=120, order_index=1, content="Learn numerical computing with Python using NumPy. This video covers arrays, indexing, slicing, vectorization, and mathematical operations essential for high-performance data manipulation."))
    db.add(Lesson(section_id=s1_4.id, title="Data Science with Pandas", video_url="https://www.youtube.com/watch?v=QUaSmqBeR9w", duration=180, order_index=2, content="Pandas is the core library for data analysis in Python. You'll learn how to work with Series and DataFrames, clean messy data, handle missing values, and perform group-by operations just like in SQL or Excel."))
    
    s1_5 = Section(course_id=c1.id, title="Data Visualization", order_index=5)
    db.add(s1_5)
    db.flush()
    db.add(Lesson(section_id=s1_5.id, title="Data Visualization with Matplotlib & Seaborn", video_url="https://www.youtube.com/watch?v=-jTD74eEy2I", duration=90, order_index=1, content="Visualizing data helps communicate insights. This lesson explores Matplotlib and Seaborn to create bar charts, line graphs, scatter plots, histograms, and heatmaps. Learn how to customize plots for professional presentations."))
    
    s1_6 = Section(course_id=c1.id, title="Statistics for Data Science", order_index=6)
    db.add(s1_6)
    db.flush()
    db.add(Lesson(section_id=s1_6.id, title="Complete Statistics Course for Data Science", video_url="https://www.youtube.com/watch?v=eF7HoC-cLRM", duration=210, order_index=1, content="A solid understanding of statistics is crucial for analytics. We cover descriptive statistics (mean, median, variance), probability distributions, hypothesis testing (z-tests, t-tests, ANOVA), and A/B testing methodologies used in the industry."))
    
    s1_7 = Section(course_id=c1.id, title="Business Intelligence with Power BI", order_index=7)
    db.add(s1_7)
    db.flush()
    db.add(Lesson(section_id=s1_7.id, title="Complete Power BI Course for Data Analysis", video_url="https://www.youtube.com/watch?v=Te8ROybkRnQ", duration=240, order_index=1, content="Bring your data to life with Power BI. Learn how to connect to data sources, use Power Query for ETL processes, build data models with DAX, and create interactive, shareable dashboards that provide real business value."))

    # COURSE 2
    c2 = Course(
        title="Excel for HR Professionals",
        description="Master Excel specifically for HR workflows — from basic data organization to advanced HR analytics, dashboards, and reporting.",
        category="Human Resources",
        price=1499.0,
        thumbnail_url="https://img.youtube.com/vi/2hOQl0CQa44/hqdefault.jpg",
        status="published",
        instructor_id=instructors[1].id,
        avg_rating=4.5
    )
    db.add(c2)
    db.flush()
    
    s2_1 = Section(course_id=c2.id, title="Excel Fundamentals for HR", order_index=1)
    db.add(s2_1)
    db.flush()
    db.add(Lesson(section_id=s2_1.id, title="Excel for HR: Beginner Tutorial", video_url="https://www.youtube.com/watch?v=2hOQl0CQa44", is_preview=True, duration=60, order_index=1, content="Start here if you are new to Excel in an HR context. This tutorial covers basic data entry, formatting employee rosters, tracking attendance, and using basic formulas like SUM, AVERAGE, and COUNT to summarize HR data."))
    
    s2_2 = Section(course_id=c2.id, title="Advanced HR Analytics in Excel", order_index=2)
    db.add(s2_2)
    db.flush()
    db.add(Lesson(section_id=s2_2.id, title="Excel for HR: Advanced Tutorial", video_url="https://www.youtube.com/watch?v=SmVAawPU6c8", duration=90, order_index=1, content="Take your HR reporting to the next level. Learn how to use VLOOKUP and INDEX/MATCH to merge employee data, build PivotTables to analyze headcount and turnover rates, and create dynamic charts for management reporting."))
    
    s2_3 = Section(course_id=c2.id, title="Full HR Excel Workflow", order_index=3)
    db.add(s2_3)
    db.flush()
    db.add(Lesson(section_id=s2_3.id, title="Excel for HR: Full Course Tutorial", video_url="https://www.youtube.com/watch?v=xTaUvknBjZU", duration=180, order_index=1, content="A comprehensive workflow demonstration. We will build a complete HR dashboard from scratch, linking multiple data sets, calculating compensation metrics, and visualizing employee performance and retention data seamlessly."))

    # COURSE 3
    c3 = Course(
        title="Complete Web Development Bootcamp",
        description="Go from beginner to job-ready web developer — HTML, CSS, JavaScript fundamentals through advanced topics, real projects, and Git/GitHub, taught by Apna College.",
        category="Technology",
        price=3499.0,
        thumbnail_url="https://img.youtube.com/vi/HcOc7P5BMi4/hqdefault.jpg",
        status="published",
        instructor_id=instructors[2].id,
        avg_rating=4.9
    )
    db.add(c3)
    db.flush()
    
    s3_1 = Section(course_id=c3.id, title="HTML Fundamentals", order_index=1)
    db.add(s3_1)
    db.flush()
    db.add(Lesson(section_id=s3_1.id, title="Complete HTML with Notes & Code", video_url="https://www.youtube.com/watch?v=HcOc7P5BMi4", is_preview=True, duration=120, order_index=1, content="Learn the standard markup language for documents designed to be displayed in a web browser. We cover document structure, semantic tags, forms, tables, and everything you need to build the skeleton of a modern website."))
    
    s3_2 = Section(course_id=c3.id, title="CSS Fundamentals", order_index=2)
    db.add(s3_2)
    db.flush()
    db.add(Lesson(section_id=s3_2.id, title="Complete CSS with Project, Notes & Code", video_url="https://www.youtube.com/watch?v=ESnrn1kAD4E", duration=150, order_index=1, content="Make your websites beautiful with CSS. This lesson covers styling text, colors, the box model, Flexbox, CSS Grid, and responsive design techniques to ensure your sites look great on mobile and desktop devices."))
    
    s3_3 = Section(course_id=c3.id, title="Practical Project: Amazon Clone", order_index=3)
    db.add(s3_3)
    db.flush()
    db.add(Lesson(section_id=s3_3.id, title="Building an Amazon Clone with HTML & CSS", video_url="https://www.youtube.com/watch?v=nGhKIC_7Mkk", duration=180, order_index=1, content="Put your HTML and CSS skills to the test by building a complete, responsive clone of the Amazon homepage. This practical project bridges the gap between learning syntax and building real-world layouts."))
    
    s3_4 = Section(course_id=c3.id, title="Version Control", order_index=4)
    db.add(s3_4)
    db.flush()
    db.add(Lesson(section_id=s3_4.id, title="Complete Git and GitHub Tutorial", video_url="https://www.youtube.com/watch?v=Ez8F0nW6S-w", duration=90, order_index=1, content="Version control is essential for any developer. Learn how to track changes using Git, make commits, handle branches and merges, and collaborate with others using GitHub repositories."))
    
    s3_5 = Section(course_id=c3.id, title="JavaScript Fundamentals", order_index=5)
    db.add(s3_5)
    db.flush()
    db.add(Lesson(section_id=s3_5.id, title="Variables & Data Types", video_url="https://www.youtube.com/watch?v=ajdRvxDWH4w", duration=45, order_index=1, content="Introduction to JavaScript. Learn how to declare variables using let, const, and var, and understand the basic data types including strings, numbers, booleans, null, and undefined."))
    db.add(Lesson(section_id=s3_5.id, title="Operators and Conditional Statements", video_url="https://www.youtube.com/watch?v=Zg4-uSjxosE", duration=50, order_index=2, content="Control the flow of your program. This video explains arithmetic, assignment, and logical operators, followed by if/else statements and switch cases for decision making in code."))
    db.add(Lesson(section_id=s3_5.id, title="Loops and Strings", video_url="https://www.youtube.com/watch?v=UmRtFFSDSFo", duration=45, order_index=3, content="Learn how to iterate using for, while, and do-while loops. We also dive deep into string manipulation, template literals, and common string methods."))
    db.add(Lesson(section_id=s3_5.id, title="Arrays", video_url="https://www.youtube.com/watch?v=gFWhbjzowrM", duration=40, order_index=4, content="Master arrays in JavaScript. Understand how to store collections of data, and learn essential array methods like push, pop, shift, unshift, slice, and splice."))
    db.add(Lesson(section_id=s3_5.id, title="Functions & Methods", video_url="https://www.youtube.com/watch?v=P0XMXqDGttU", duration=55, order_index=5, content="Functions are reusable blocks of code. We cover function declarations, expressions, arrow functions, parameters, return values, and higher-order functions like map, filter, and reduce."))
    
    s3_6 = Section(course_id=c3.id, title="DOM & Events", order_index=6)
    db.add(s3_6)
    db.flush()
    db.add(Lesson(section_id=s3_6.id, title="Document Object Model, Part 1", video_url="https://www.youtube.com/watch?v=7zcXPCt8Ck0", duration=60, order_index=1, content="Start interacting with web pages. Learn how JavaScript represents the HTML document as a tree structure (the DOM) and how to select and inspect elements using query selectors."))
    db.add(Lesson(section_id=s3_6.id, title="Document Object Model, Part 2", video_url="https://www.youtube.com/watch?v=fXAGTOZ25H8", duration=55, order_index=2, content="Go further with the DOM. Learn how to dynamically create new elements, modify attributes, change styles, and traverse the DOM tree from parent to child nodes."))
    db.add(Lesson(section_id=s3_6.id, title="Events in JavaScript", video_url="https://www.youtube.com/watch?v=_i-uLJAh79U", duration=65, order_index=3, content="Make your pages interactive! This lesson covers event listeners, event objects, bubbling and capturing, and how to respond to user clicks, keyboard inputs, and form submissions."))
    
    s3_7 = Section(course_id=c3.id, title="JavaScript Projects", order_index=7)
    db.add(s3_7)
    db.flush()
    db.add(Lesson(section_id=s3_7.id, title="Tic Tac Toe Game Project", video_url="https://www.youtube.com/watch?v=SqrppLEljkY", duration=70, order_index=1, content="Apply your DOM and Events knowledge by building a fully functional Tic Tac Toe game from scratch. Great practice for managing game state and DOM updates."))
    db.add(Lesson(section_id=s3_7.id, title="Stone, Paper & Scissors Game", video_url="https://www.youtube.com/watch?v=_V33HCZWLDQ", duration=60, order_index=2, content="Another fun project to reinforce your logic and UI manipulation skills. Build a classic Rock, Paper, Scissors game with score tracking and dynamic animations."))
    
    s3_8 = Section(course_id=c3.id, title="OOP & Async JavaScript", order_index=8)
    db.add(s3_8)
    db.flush()
    db.add(Lesson(section_id=s3_8.id, title="Classes & Objects", video_url="https://www.youtube.com/watch?v=N-O4w6PynGY", duration=75, order_index=1, content="Learn Object-Oriented Programming (OOP) in JavaScript. We cover classes, constructors, methods, inheritance, and the 'this' keyword to structure complex applications cleanly."))
    db.add(Lesson(section_id=s3_8.id, title="Callbacks, Promises & Async Await", video_url="https://www.youtube.com/watch?v=d3jXofmQm44", duration=85, order_index=2, content="Master asynchronous programming. Understand the event loop, how to escape callback hell using Promises, and the modern async/await syntax for writing clean asynchronous code."))
    db.add(Lesson(section_id=s3_8.id, title="Fetch API with Project", video_url="https://www.youtube.com/watch?v=CyGodpqcid4", duration=80, order_index=3, content="Learn how to interact with external servers and APIs. We will use the Fetch API to request data, handle JSON responses, and integrate third-party data into a practical web project."))
    
    s3_9 = Section(course_id=c3.id, title="Roadmap & Wrap-up", order_index=9)
    db.add(s3_9)
    db.flush()
    db.add(Lesson(section_id=s3_9.id, title="Web Development Complete Roadmap", video_url="https://www.youtube.com/watch?v=4WjtQjPQGIs", duration=40, order_index=1, content="Now that you know the fundamentals, what's next? This lesson provides a complete roadmap for moving into frontend frameworks (like React), backend development (Node.js), and database management to become a full-stack developer."))
    
    db.commit()

    # Add Reviews and Enrollments
    print("Adding reviews and enrollments...")
    courses = [c1, c2, c3]
    for c in courses:
        # Enroll 3-5 random learners
        enrolled_learners = random.sample(learners, k=random.randint(3, 5))
        for idx, l in enumerate(enrolled_learners):
            db.add(Enrollment(learner_id=l.id, course_id=c.id))
            
            # Leave a review
            ratings = [5, 4, 5, 3, 4]
            rating = ratings[idx % len(ratings)]
            comments = [
                "Absolutely loved this course. Very clear explanations.",
                "Good material, but could use more exercises.",
                "Best course I've taken on this topic. Highly recommend!",
                "Solid content, a bit fast-paced for absolute beginners.",
                "Very well structured and easy to follow."
            ]
            db.add(Review(learner_id=l.id, course_id=c.id, rating=rating, comment=comments[idx % len(comments)]))
    
    db.commit()
    print("Seeding complete.")

if __name__ == "__main__":
    main()
