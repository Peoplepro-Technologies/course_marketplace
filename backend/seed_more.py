import sys
import uuid
import random
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
engine = create_engine("postgresql://postgres:manasvi@localhost:5432/course_marketplace")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
from app.models.user import User
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.models.review import Review
from app.models.enrollment import Enrollment
from app.models.category import Category

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def main():
    db: Session = next(get_db())
    
    # 1. FIX CATEGORY BUG
    print("Fixing categories table and existing courses...")
    
    # Ensure categories exist
    required_categories = [
        "Data & Analytics",
        "Human Resources",
        "Technology",
        "Marketing",
        "Business",
        "Design",
        "General"
    ]
    
    for cat_name in required_categories:
        existing_cat = db.query(Category).filter_by(name=cat_name).first()
        if not existing_cat:
            new_cat = Category(name=cat_name)
            db.add(new_cat)
    db.commit()

    # The existing courses might be "General" because of how the API created them originally?
    # No, I used seed.py but let's just force update them by title.
    c1 = db.query(Course).filter(Course.title.ilike("%Data Analyst Bootcamp%")).first()
    if c1:
        c1.category = "Data & Analytics"
        
    c2 = db.query(Course).filter(Course.title.ilike("%Excel for HR%")).first()
    if c2:
        c2.category = "Human Resources"
        
    c3 = db.query(Course).filter(Course.title.ilike("%Web Development Bootcamp%")).first()
    if c3:
        c3.category = "Technology"
        
    db.commit()

    # Query to confirm they are fixed
    all_courses = db.query(Course).all()
    print("Current DB Courses after fix:")
    for c in all_courses:
        print(f" - {c.title} -> Category: {c.category}")

    # 2. ADD 3 MORE COURSES
    print("Seeding 3 new courses...")
    
    # Get instructors and learners
    instructors = db.query(User).filter_by(role="instructor").all()
    if not instructors:
        # Create one if missing
        instructor = User(keycloak_sub=f"inst_new_{uuid.uuid4()}", name="Instructor New", email="newinst@test.com", role="instructor")
        db.add(instructor)
        db.commit()
        instructors = [instructor]
        
    learners = db.query(User).filter_by(role="learner").all()
    
    # COURSE 4: Digital Marketing Masterclass
    c4 = Course(
        title="Digital Marketing Masterclass: SEO, Social Media & Ads",
        description="A complete digital marketing course covering SEO, social media marketing, Google/Facebook ads, email marketing, and content strategy ? everything needed to launch a digital marketing career or grow a business online.",
        category="Marketing",
        price=2499.0,
        thumbnail_url="https://img.youtube.com/vi/bixR-KIJKYM/hqdefault.jpg",
        status="published",
        instructor_id=instructors[0].id,
        avg_rating=4.7
    )
    db.add(c4)
    db.flush()
    
    # Sections and Lessons for C4
    s4_1 = Section(course_id=c4.id, title="Digital Marketing Fundamentals", order_index=1)
    db.add(s4_1)
    db.flush()
    db.add(Lesson(section_id=s4_1.id, title="Digital Marketing In 5 Minutes: What Is Digital Marketing?", video_url="https://www.youtube.com/watch?v=bixR-KIJKYM", is_preview=True, duration=5, order_index=1, content="A quick 5-minute overview of what digital marketing actually is. We cover the main channels like SEO, social media, and paid ads, and explain why traditional marketing is shifting to digital platforms."))
    db.add(Lesson(section_id=s4_1.id, title="How To Start a Career in Digital Marketing", video_url="https://www.youtube.com/watch?v=GjYJq30u9wA", duration=15, order_index=2, content="Ready to make digital marketing your career? This lesson covers the required skills, entry-level job roles, salary expectations, and practical steps to build a portfolio and land your first client or job."))

    s4_2 = Section(course_id=c4.id, title="Search Engine Optimization (SEO)", order_index=2)
    db.add(s4_2)
    db.flush()
    db.add(Lesson(section_id=s4_2.id, title="SEO Full Course 2026", video_url="https://www.youtube.com/watch?v=xsVTqzcsI", duration=388, order_index=1, content="Master Search Engine Optimization. This massive tutorial dives into on-page SEO, off-page SEO, technical SEO, and how search engine algorithms rank content. Learn how to optimize websites to drive massive organic traffic."))
    db.add(Lesson(section_id=s4_2.id, title="Keyword Research Tutorial for SEO", video_url="https://www.youtube.com/watch?v=4TzBvuM00xM", duration=45, order_index=2, content="Keyword research is the foundation of SEO. Learn how to use tools like Google Keyword Planner and Ahrefs to find low-competition, high-volume keywords to target for your business or clients."))
    db.add(Lesson(section_id=s4_2.id, title="SEO Backlinks & Link Building Tutorial", video_url="https://www.youtube.com/watch?v=Ove-t_9Xq3w", duration=50, order_index=3, content="Off-page SEO relies heavily on backlinks. We explore safe, white-hat link-building strategies, outreach techniques, and how to acquire high-authority backlinks to boost your domain authority."))

    s4_3 = Section(course_id=c4.id, title="Social Media Marketing", order_index=3)
    db.add(s4_3)
    db.flush()
    db.add(Lesson(section_id=s4_3.id, title="Social Media Marketing Full Course", video_url="https://www.youtube.com/watch?v=nU-IIXBWlg", duration=543, order_index=1, content="A comprehensive deep dive into Social Media Marketing. We cover organic and paid strategies across Facebook, Instagram, Twitter, and LinkedIn, including content calendars and community management."))
    db.add(Lesson(section_id=s4_3.id, title="Facebook Ads Tutorial: How To Run Facebook Ads", video_url="https://www.youtube.com/watch?v=TcwqU0V9LhA", duration=120, order_index=2, content="Learn how to navigate the Facebook Ads Manager. We cover campaign objectives, detailed audience targeting, budget optimization, and creating compelling ad creatives that convert."))
    db.add(Lesson(section_id=s4_3.id, title="YouTube Ads Tutorial", video_url="https://www.youtube.com/watch?v=R9jGvP9VjJw", duration=90, order_index=3, content="Video advertising is highly effective. Learn how to set up TrueView, non-skippable, and bumper ads on YouTube, and how to target users based on their watch history and search intent."))

    s4_4 = Section(course_id=c4.id, title="Google Ads & Paid Advertising", order_index=4)
    db.add(s4_4)
    db.flush()
    db.add(Lesson(section_id=s4_4.id, title="Google Ads Tutorial: PPC Advertising", video_url="https://www.youtube.com/watch?v=zJRPJmG2s", duration=180, order_index=1, content="Master Pay-Per-Click advertising with Google Ads. Learn how to create search campaigns, conduct bidding, improve Quality Score, and track conversions to ensure a high return on ad spend (ROAS)."))

    s4_5 = Section(course_id=c4.id, title="Email & Content Marketing", order_index=5)
    db.add(s4_5)
    db.flush()
    db.add(Lesson(section_id=s4_5.id, title="Email Marketing Full Course", video_url="https://www.youtube.com/watch?v=9Z0o0u3X", duration=310, order_index=1, content="Email has one of the highest ROIs in digital marketing. Learn list-building techniques, segmentation, automation workflows, and how to write persuasive copy that gets opened and clicked."))
    db.add(Lesson(section_id=s4_5.id, title="Content Marketing Strategy & Examples", video_url="https://www.youtube.com/watch?v=Nn1D_V2jP", duration=60, order_index=2, content="Content is king. Learn how to build a robust content marketing strategy that aligns with the buyer's journey. We analyze successful case studies and how to distribute content effectively."))

    s4_6 = Section(course_id=c4.id, title="Analytics & Freelancing", order_index=6)
    db.add(s4_6)
    db.flush()
    db.add(Lesson(section_id=s4_6.id, title="Google Analytics Tutorial for Beginners", video_url="https://www.youtube.com/watch?v=D-w-w73j0", duration=120, order_index=1, content="You can't improve what you can't measure. Learn how to set up Google Analytics 4, track user behavior, analyze traffic sources, and create custom reports for data-driven decisions."))
    db.add(Lesson(section_id=s4_6.id, title="How To Become a Digital Marketing Freelancer", video_url="https://www.youtube.com/watch?v=Zf34hX", duration=45, order_index=2, content="Learn the business side of digital marketing. We cover how to price your services, pitch to clients, write proposals, and build a sustainable freelance business working from anywhere."))

    # COURSE 5: Business Management Essentials
    c5 = Course(
        title="Business Management Essentials",
        description="Learn core business management skills ? strategy, operations, HR basics, finance, and how to start and grow a business ? through practical, real-world lessons.",
        category="Business",
        price=1999.0,
        thumbnail_url="https://img.youtube.com/vi/HE9JioDuXkQ/hqdefault.jpg",
        status="published",
        instructor_id=instructors[0].id if len(instructors) == 1 else instructors[1].id,
        avg_rating=4.6
    )
    db.add(c5)
    db.flush()
    
    s5_1 = Section(course_id=c5.id, title="Introduction to Business Management", order_index=1)
    db.add(s5_1)
    db.flush()
    db.add(Lesson(section_id=s5_1.id, title="Introducing Business Management Course", video_url="https://www.youtube.com/watch?v=HE9JioDuXkQ", is_preview=True, duration=10, order_index=1, content="Welcome to the Business Management Essentials course. This introductory video outlines the core pillars of business: strategy, operations, finance, marketing, and leadership, setting the stage for the rest of the curriculum."))
    
    s5_2 = Section(course_id=c5.id, title="Business Strategy & Planning", order_index=2)
    db.add(s5_2)
    db.flush()
    db.add(Lesson(section_id=s5_2.id, title="6 Steps to Write Business Management Strategy", video_url="https://www.youtube.com/watch?v=gGE4GUv1-F0", duration=25, order_index=1, content="A strong strategy is the foundation of any successful business. We break down the 6 critical steps to formulating a business strategy, from competitive analysis to goal setting and execution mapping."))
    db.add(Lesson(section_id=s5_2.id, title="Business Research Methods for New Business Ideas", video_url="https://www.youtube.com/watch?v=jctM1Rcaeo4", duration=30, order_index=2, content="Before launching a product, you must validate the market. Learn essential primary and secondary research methods to test new business ideas, analyze the competition, and identify target demographics."))
    
    s5_3 = Section(course_id=c5.id, title="Business Operations", order_index=3)
    db.add(s5_3)
    db.flush()
    db.add(Lesson(section_id=s5_3.id, title="7 Steps of Business Operations", video_url="https://www.youtube.com/watch?v=n5QbXvDAZN8", duration=35, order_index=1, content="Operations is how a business actually delivers value day-to-day. We cover the 7 key steps to streamline operations, improve efficiency, manage supply chains, and ensure quality control."))
    db.add(Lesson(section_id=s5_3.id, title="40 Business Documents You Must Need", video_url="https://www.youtube.com/watch?v=72rTAyxd974", duration=40, order_index=2, content="Every business relies on documentation. This lesson walks through 40 essential business documents, including NDAs, employment contracts, standard operating procedures (SOPs), and financial statements."))

    s5_4 = Section(course_id=c5.id, title="Finance & Accounting Basics", order_index=4)
    db.add(s5_4)
    db.flush()
    db.add(Lesson(section_id=s5_4.id, title="Business Finance in Business Management", video_url="https://www.youtube.com/watch?v=T3l51Psce3c", duration=45, order_index=1, content="Understand the financial health of your organization. We cover capital allocation, funding sources, cash flow management, and the difference between profit and sustainable growth."))
    db.add(Lesson(section_id=s5_4.id, title="How to Learn Business Accounting", video_url="https://www.youtube.com/watch?v=0a4tXP7m_N0", duration=50, order_index=2, content="Demystify business accounting. Learn how to read and interpret the three main financial statements: the balance sheet, the income statement (P&L), and the cash flow statement."))
    db.add(Lesson(section_id=s5_4.id, title="How to Write a Business Budget Plan", video_url="https://www.youtube.com/watch?v=CnOucbYNsys", duration=35, order_index=3, content="A budget is a financial roadmap. This lesson provides a step-by-step guide to forecasting revenues, estimating expenses, and creating a robust budget plan to keep your business profitable."))
    
    s5_5 = Section(course_id=c5.id, title="Human Resource Management", order_index=5)
    db.add(s5_5)
    db.flush()
    db.add(Lesson(section_id=s5_5.id, title="Human Resource Management Explained", video_url="https://www.youtube.com/watch?v=PhkcstGNWtc", duration=40, order_index=1, content="People are your most valuable asset. Learn the fundamentals of HR management, including recruitment, onboarding, performance reviews, employee retention, and navigating basic labor laws."))

    s5_6 = Section(course_id=c5.id, title="Marketing & Customer Management", order_index=6)
    db.add(s5_6)
    db.flush()
    db.add(Lesson(section_id=s5_6.id, title="Top 40 Business Marketing Methods", video_url="https://www.youtube.com/watch?v=uaTTzNgRt-o", duration=60, order_index=1, content="A rapid-fire overview of 40 proven marketing methods. Discover traditional and digital strategies to increase brand awareness, generate leads, and drive sales across various industries."))
    db.add(Lesson(section_id=s5_6.id, title="How to Get Customers for Your New Business", video_url="https://www.youtube.com/watch?v=rVEvsLNRAuk", duration=30, order_index=2, content="Acquiring your first customers is often the hardest part. Learn actionable, low-cost strategies to find early adopters, build a sales funnel, and convert prospects into paying clients."))
    db.add(Lesson(section_id=s5_6.id, title="How to Provide Great Customer Service", video_url="https://www.youtube.com/watch?v=EiIlIHDqt-Q", duration=25, order_index=3, content="Customer retention is cheaper than acquisition. This lesson covers conflict resolution, setting up support systems, and building a customer-centric culture that generates repeat business and referrals."))

    s5_7 = Section(course_id=c5.id, title="Growth & Leadership", order_index=7)
    db.add(s5_7)
    db.flush()
    db.add(Lesson(section_id=s5_7.id, title="How to Manage a Business and Become a Great Leader", video_url="https://www.youtube.com/watch?v=r1wramwGjmE", duration=45, order_index=1, content="Management and leadership are different skills. Learn how to inspire teams, delegate effectively, make tough decisions under pressure, and foster a positive, productive company culture."))
    db.add(Lesson(section_id=s5_7.id, title="How to Start and Grow Your Business", video_url="https://www.youtube.com/watch?v=BHL_zqoF--8", duration=55, order_index=2, content="The ultimate guide to scaling. Once your business is established, how do you take it to the next level? We discuss strategic partnerships, scaling operations, entering new markets, and securing growth capital."))

    # COURSE 6: UI/UX Design with Figma
    c6 = Course(
        title="UI/UX Design with Figma",
        description="Learn professional UI/UX design using Figma ? from basics to advanced prototyping, design systems, and developer handoff, taught by Cutting Edge School.",
        category="Design",
        price=2999.0,
        thumbnail_url="https://img.youtube.com/vi/bI6q16ffdgQ/hqdefault.jpg",
        status="published",
        instructor_id=instructors[-1].id,
        avg_rating=4.9
    )
    db.add(c6)
    db.flush()
    
    s6_1 = Section(course_id=c6.id, title="Figma Fundamentals", order_index=1)
    db.add(s6_1)
    db.flush()
    db.add(Lesson(section_id=s6_1.id, title="Basics of Figma & UX (Episode 1)", video_url="https://www.youtube.com/watch?v=bI6q16ffdgQ", is_preview=True, duration=45, order_index=1, content="An introduction to the Figma interface and basic UX principles. Learn how to navigate the canvas, use shape tools, and understand the difference between User Interface (UI) and User Experience (UX) design."))
    
    s6_2 = Section(course_id=c6.id, title="Layout & Structure", order_index=2)
    db.add(s6_2)
    db.flush()
    db.add(Lesson(section_id=s6_2.id, title="Figma Frames & Autolayout", video_url="https://www.youtube.com/watch?v=d88nvmnj5mU", duration=50, order_index=1, content="Mastering Auto Layout is critical for responsive design. We cover frames, constraints, padding, alignment, and how to use Auto Layout to build fluid, adaptable interfaces that developers will love."))
    
    s6_3 = Section(course_id=c6.id, title="Styles & Design Systems", order_index=3)
    db.add(s6_3)
    db.flush()
    db.add(Lesson(section_id=s6_3.id, title="Figma Styles & Libraries", video_url="https://www.youtube.com/watch?v=LcY0X10H2wo", duration=35, order_index=1, content="Keep your designs consistent by using Styles. Learn how to create and manage text, color, and effect styles, and how to publish them to a team library for shared use across multiple files."))
    db.add(Lesson(section_id=s6_3.id, title="Figma Components & Variants", video_url="https://www.youtube.com/watch?v=Vjw47lNNbeA", duration=60, order_index=2, content="Components are reusable design elements. This lesson dives deep into creating master components, overriding instances, and using Variants to manage complex UI states (like button hovers and active tabs)."))
    db.add(Lesson(section_id=s6_3.id, title="Figma Variables", video_url="https://www.youtube.com/watch?v=lf6jUWeCKMg", duration=55, order_index=3, content="Variables bring logic to design. Learn how to use Figma's advanced variables feature to manage design tokens, create light/dark mode themes, and build more dynamic prototypes without duplicating frames."))
    db.add(Lesson(section_id=s6_3.id, title="How to Make a Design System in Figma", video_url="https://www.youtube.com/watch?v=N1G5KSEXzDM", duration=70, order_index=4, content="Bring it all together by building a foundational Design System. We'll set up a comprehensive sticker sheet containing typography scales, color palettes, atomic components, and documentation guidelines."))
    
    s6_4 = Section(course_id=c6.id, title="Prototyping & Handoff", order_index=4)
    db.add(s6_4)
    db.flush()
    db.add(Lesson(section_id=s6_4.id, title="How to Prototype on Figma", video_url="https://www.youtube.com/watch?v=V_xewhxeZvM", duration=45, order_index=1, content="Bring your static designs to life! Learn how to wire frames together, use smart animate for smooth transitions, and create interactive overlays and scrolling behaviors for realistic user testing."))
    db.add(Lesson(section_id=s6_4.id, title="Developer Handoff in Figma", video_url="https://www.youtube.com/watch?v=nXzBmISJWG0", duration=30, order_index=2, content="Design doesn't end with a prototype. Learn how to prepare your Figma files for developer handoff, use Dev Mode effectively, export assets, and communicate design intent to the engineering team."))

    db.commit()

    # Add Reviews and Enrollments
    print("Adding reviews and enrollments to new courses...")
    new_courses = [c4, c5, c6]
    for c in new_courses:
        if learners:
            enrolled_learners = random.sample(learners, k=min(random.randint(3, 5), len(learners)))
            for idx, l in enumerate(enrolled_learners):
                db.add(Enrollment(learner_id=l.id, course_id=c.id))
                ratings = [5, 4, 5, 4, 5]
                comments = [
                    "Excellent content and very well explained.",
                    "Great examples, but maybe a bit too long.",
                    "This course helped me land a job. 10/10!",
                    "Very informative and practical.",
                    "The best resource I've found on this topic."
                ]
                db.add(Review(learner_id=l.id, course_id=c.id, rating=ratings[idx % len(ratings)], comment=comments[idx % len(comments)]))
    
    db.commit()
    
    print("\n--- FINAL CATEGORY BREAKDOWN ---")
    cat_counts = {}
    for c in db.query(Course).all():
        cat_counts[c.category] = cat_counts.get(c.category, 0) + 1
    
    for cat, count in cat_counts.items():
        print(f"Category '{cat}': {count} course(s)")

if __name__ == "__main__":
    main()
