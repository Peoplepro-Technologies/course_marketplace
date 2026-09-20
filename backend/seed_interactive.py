"""
seed_interactive.py — Populate 6 courses with quiz questions and assignments.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.quiz import QuizQuestion
from app.models.assignment import Assignment

engine = create_engine("postgresql://postgres:manasvi@localhost:5432/course_marketplace")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()

    # ─── Clear any existing quiz/assignment data ───────────────────────────
    db.query(QuizQuestion).delete()
    db.query(Assignment).delete()
    db.commit()

    quizzes = []
    assignments = []

    # ═══════════════════════════════════════════════════════════════════════
    # COURSE 1: Data Analyst Bootcamp
    # ═══════════════════════════════════════════════════════════════════════

    # Lesson: Complete MS Excel Course for Data Analysts
    excel_lesson = "03f7ca91-330b-4d97-8e0e-8b5f5d40f64b"
    quizzes += [
        QuizQuestion(lesson_id=excel_lesson, question_text="Which Excel function returns the largest value in a range?",
            options=["=AVERAGE(A1:A10)", "=MAX(A1:A10)", "=COUNT(A1:A10)", "=SUM(A1:A10)"],
            correct_option_index=1,
            explanation="MAX() returns the largest value in a given set of values or range, making it the right choice for finding peak values in a dataset."),
        QuizQuestion(lesson_id=excel_lesson, question_text="What does VLOOKUP stand for?",
            options=["Variable Lookup", "Vertical Lookup", "Value Lookup", "Vector Lookup"],
            correct_option_index=1,
            explanation="VLOOKUP stands for Vertical Lookup — it searches for a value in the first column of a range and returns a value in the same row from a column you specify."),
        QuizQuestion(lesson_id=excel_lesson, question_text="What symbol must precede a formula in Excel?",
            options=["#", "@", "=", "+"],
            correct_option_index=2,
            explanation="All Excel formulas begin with an = sign. Without it, Excel treats the entry as plain text rather than a formula to be evaluated."),
    ]

    # Lesson: Complete SQL in One Shot for Data Analytics
    sql_lesson = "9e7083b3-9057-4518-be63-793f726a5c51"
    quizzes += [
        QuizQuestion(lesson_id=sql_lesson, question_text="Which SQL clause is used to filter rows after grouping?",
            options=["WHERE", "HAVING", "FILTER", "GROUP BY"],
            correct_option_index=1,
            explanation="HAVING is used to filter groups created by GROUP BY, whereas WHERE filters individual rows before grouping occurs."),
        QuizQuestion(lesson_id=sql_lesson, question_text="What does SELECT DISTINCT do?",
            options=["Returns all rows including duplicates", "Returns only unique rows", "Sorts results in ascending order", "Filters rows by a condition"],
            correct_option_index=1,
            explanation="SELECT DISTINCT eliminates duplicate rows from the result set, returning only unique combinations of the selected columns."),
        QuizQuestion(lesson_id=sql_lesson, question_text="Which JOIN type returns all rows from the left table plus matching rows from the right?",
            options=["INNER JOIN", "RIGHT JOIN", "LEFT JOIN", "CROSS JOIN"],
            correct_option_index=2,
            explanation="LEFT JOIN returns all rows from the left table and matched rows from the right. Rows in the left table with no match in the right table appear with NULLs."),
    ]

    # Lesson: Data Visualization with Matplotlib & Seaborn
    viz_lesson = "873fd33c-6458-4861-91a9-faae1f96848f"
    assignments += [
        Assignment(lesson_id=viz_lesson, title="Create a Sales Performance Dashboard",
            instructions="""Using any publicly available dataset (e.g. a CSV of monthly sales figures), create a Python script that produces the following visualizations:

1. A line chart showing sales trend over time.
2. A bar chart comparing revenue by category or region.
3. A heatmap showing correlations between at least 3 numeric variables.

Requirements:
- Use Matplotlib and Seaborn.
- Add clear axis labels, titles, and legends to each chart.
- Save all three charts as PNG files.
- Write a brief (100–150 word) paragraph summarizing the 3 most interesting insights you found in the data.

Submit: Paste your Python code and your 3-insight paragraph below."""),
    ]

    # ═══════════════════════════════════════════════════════════════════════
    # COURSE 2: Excel for HR Professionals
    # ═══════════════════════════════════════════════════════════════════════

    # Lesson: Excel for HR: Beginner Tutorial
    hr_excel_beginner = "c42da9dc-cf9e-4a98-9cc6-e521f0badfbc"
    quizzes += [
        QuizQuestion(lesson_id=hr_excel_beginner, question_text="Which formula would you use to count how many employees appear in column A?",
            options=["=SUM(A:A)", "=COUNT(A:A)", "=COUNTA(A:A)", "=SUMIF(A:A,A1)"],
            correct_option_index=2,
            explanation="COUNTA counts all non-empty cells, making it ideal for counting employees in a column that contains text names. COUNT only counts numeric values."),
        QuizQuestion(lesson_id=hr_excel_beginner, question_text="What does the CONCATENATE function do?",
            options=["Adds numbers together", "Combines text from multiple cells", "Removes duplicate rows", "Sorts data alphabetically"],
            correct_option_index=1,
            explanation="CONCATENATE (and its modern equivalent &) joins text strings from multiple cells. HR professionals commonly use it to combine first and last name columns."),
        QuizQuestion(lesson_id=hr_excel_beginner, question_text="In an HR payroll sheet, which function calculates the net pay after tax using a known percentage?",
            options=["=SUM(B2-C2)", "=B2*(1-tax_rate)", "=AVERAGE(B2:C2)", "=IF(B2>0,B2,0)"],
            correct_option_index=1,
            explanation="=B2*(1-tax_rate) subtracts the tax percentage from gross pay. For example, =B2*(1-0.3) gives the take-home pay after a 30% tax deduction."),
    ]

    # Lesson: Excel for HR: Full Course Tutorial (capstone)
    hr_excel_full = "fb30e7f5-e90e-4d08-876e-7a7947ba46a2"
    assignments += [
        Assignment(lesson_id=hr_excel_full, title="Build an Employee Attrition Tracker",
            instructions="""Create an Excel workbook that tracks employee attrition for a fictional company with at least 20 employees.

Your workbook must include:

1. An Employee Data sheet with columns: Employee ID, Name, Department, Start Date, End Date, Status (Active/Resigned/Terminated), Reason for Leaving.
2. A Summary sheet using formulas (COUNTIF, AVERAGEIF, etc.) that shows:
   - Total headcount
   - Number of departures this year
   - Attrition rate (%) by department
   - Average tenure (in years) of departed employees
3. A simple bar chart of attrition by department.

Submit: Describe your workbook structure, the formulas you used for each summary metric, and your key observation about which department had the highest attrition rate and a possible reason why."""),
    ]

    # ═══════════════════════════════════════════════════════════════════════
    # COURSE 3: Complete Web Development Bootcamp
    # ═══════════════════════════════════════════════════════════════════════

    # Lesson: Complete CSS with Project, Notes & Code
    css_lesson = "86986f2d-f50e-4624-835c-447e07cbd986"
    quizzes += [
        QuizQuestion(lesson_id=css_lesson, question_text="Which CSS property controls the space between an element's content and its border?",
            options=["margin", "border-spacing", "padding", "gap"],
            correct_option_index=2,
            explanation="padding controls the space between an element's content and its border. margin controls the space outside the border, between adjacent elements."),
        QuizQuestion(lesson_id=css_lesson, question_text="What does 'display: flex' do to a container's children?",
            options=["Stacks children in a fixed grid", "Lays children out in a flexible row or column", "Hides children from view", "Positions children absolutely"],
            correct_option_index=1,
            explanation="display: flex activates the Flexbox layout. Children of a flex container become flex items and are laid out in a row (by default) or column based on flex-direction."),
        QuizQuestion(lesson_id=css_lesson, question_text="Which selector targets an element with id='hero'?",
            options=[".hero", "#hero", "hero", "[hero]"],
            correct_option_index=1,
            explanation="In CSS, the # prefix denotes an ID selector. #hero targets the specific element with id='hero'. The . prefix is used for class selectors."),
    ]

    # Lesson: Variables & Data Types (JavaScript)
    js_vars_lesson = "100140f2-114a-4519-9831-118ba2b33255"
    quizzes += [
        QuizQuestion(lesson_id=js_vars_lesson, question_text="Which JavaScript keyword declares a variable that cannot be reassigned?",
            options=["var", "let", "const", "static"],
            correct_option_index=2,
            explanation="const declares a block-scoped constant — the variable binding cannot be reassigned after declaration. Note that if the value is an object, its properties can still be mutated."),
        QuizQuestion(lesson_id=js_vars_lesson, question_text="What is the result of typeof null in JavaScript?",
            options=["'null'", "'undefined'", "'object'", "'boolean'"],
            correct_option_index=2,
            explanation="This is a well-known quirk of JavaScript: typeof null returns 'object' rather than 'null'. This is a historical bug that was never corrected to maintain backward compatibility."),
    ]

    # Lesson: Building an Amazon Clone — capstone assignment
    amazon_lesson = "2d31a509-c132-450f-b973-5fe1a618821f"
    assignments += [
        Assignment(lesson_id=amazon_lesson, title="Design and Document Your Own HTML & CSS Clone Project",
            instructions="""After building the Amazon clone in this lesson, it's time to apply the same skills to your own project.

Choose any real e-commerce or portfolio website to clone (e.g. Flipkart, Zara, Netflix landing page) and complete the following:

1. Structure: Describe which sections of your chosen site you will replicate (header, hero, product grid, footer, etc.) and sketch a rough layout on paper or in a tool of your choice.
2. HTML Plan: List the semantic HTML tags you'll use for each section (e.g. <nav>, <main>, <section>, <article>, <footer>).
3. CSS Plan: List the top 5 CSS properties/techniques you'll rely on (e.g. Flexbox for the navbar, CSS Grid for the product cards, box-shadow for cards).
4. Challenges: Describe 2 specific challenges you anticipate and how you plan to overcome them.

Submit: Your written plan (200–300 words) below. If you have already started coding, you may also paste a snippet of your HTML structure."""),
    ]

    # ═══════════════════════════════════════════════════════════════════════
    # COURSE 4: Digital Marketing Masterclass
    # ═══════════════════════════════════════════════════════════════════════

    # Lesson: SEO Full Course 2026
    seo_lesson = "14a63b74-f22e-49f7-9c31-55632ba2ac42"
    quizzes += [
        QuizQuestion(lesson_id=seo_lesson, question_text="What does 'organic traffic' mean in SEO?",
            options=["Traffic from paid ads", "Traffic from social media posts", "Traffic from unpaid search engine results", "Traffic from email campaigns"],
            correct_option_index=2,
            explanation="Organic traffic refers to visitors who land on your website from unpaid (natural) search engine results. It is the primary goal of SEO — growing this traffic without paying for each click."),
        QuizQuestion(lesson_id=seo_lesson, question_text="Which HTML tag carries the most SEO weight for defining a page's main topic?",
            options=["<meta>", "<h1>", "<title>", "<strong>"],
            correct_option_index=1,
            explanation="The <h1> tag signals to search engines the primary topic of a page's content. Each page should have exactly one <h1> that clearly and accurately describes the page's main subject."),
        QuizQuestion(lesson_id=seo_lesson, question_text="What is a 'backlink' in SEO?",
            options=["A link within your own site to another of your own pages", "A hyperlink from another website pointing to your website", "A redirect from an old URL to a new URL", "A link in your website's XML sitemap"],
            correct_option_index=1,
            explanation="A backlink (inbound link) is a hyperlink from an external website to yours. Search engines treat backlinks as votes of trust and authority — quality backlinks from reputable sites are one of the strongest ranking signals."),
    ]

    # Lesson: Keyword Research Tutorial for SEO
    keyword_lesson = "de87621c-527d-4a0d-93a7-589731a96176"
    assignments += [
        Assignment(lesson_id=keyword_lesson, title="Perform a Keyword Research Report for a Niche of Your Choice",
            instructions="""Using a free keyword research tool (Google Keyword Planner, Ubersuggest, or Keywords Everywhere), research a niche topic of your choice.

Deliverables:
1. Target Niche: State your chosen niche (e.g. "vegan baking recipes" or "budget travel Southeast Asia").
2. Seed Keywords: List 5 broad seed keywords relevant to your niche.
3. Long-tail Keywords: For each seed keyword, find 2 long-tail variations with lower competition. (e.g. "vegan chocolate cake recipe without eggs").
4. Search Intent Classification: For 5 of your keywords, state whether the search intent is Informational, Navigational, Transactional, or Commercial.
5. Content Idea: Suggest one blog post or landing page title that targets one of your best long-tail keywords.

Submit: Your complete keyword research report (can be a table or bullet-point list) below."""),
    ]

    # Lesson: Google Analytics Tutorial for Beginners
    analytics_lesson = "73804419-b1c7-4a6d-a188-ed003cded2be"
    quizzes += [
        QuizQuestion(lesson_id=analytics_lesson, question_text="In Google Analytics, what does 'Bounce Rate' measure?",
            options=["The percentage of sessions where users visited more than 3 pages", "The percentage of single-page sessions with no interaction", "The number of users who returned to the site", "The average time a user spends on a page"],
            correct_option_index=1,
            explanation="Bounce rate is the percentage of sessions in which the user left after viewing only one page without interacting further. A high bounce rate can indicate poor content relevance or a bad landing page experience."),
    ]

    # ═══════════════════════════════════════════════════════════════════════
    # COURSE 5: Business Management Essentials
    # ═══════════════════════════════════════════════════════════════════════

    # Lesson: 7 Steps of Business Operations
    ops_lesson = "e831908e-99d3-49dd-8f92-8a4d05b1793c"
    quizzes += [
        QuizQuestion(lesson_id=ops_lesson, question_text="Which business operations framework focuses on identifying and eliminating waste?",
            options=["Six Sigma", "Lean Manufacturing", "Balanced Scorecard", "SWOT Analysis"],
            correct_option_index=1,
            explanation="Lean Manufacturing (originally from Toyota's Production System) is built around identifying and systematically eliminating all forms of waste (muda) in operational processes to improve efficiency."),
        QuizQuestion(lesson_id=ops_lesson, question_text="What does KPI stand for in business management?",
            options=["Key Performance Indicator", "Key Process Integration", "Knowledge and Process Index", "Key Product Insight"],
            correct_option_index=0,
            explanation="KPI stands for Key Performance Indicator — a measurable value that demonstrates how effectively an organization is achieving its key business objectives."),
    ]

    # Lesson: Business Finance in Business Management
    finance_lesson = "e5fe4687-57d8-433d-9fe1-3e7ee4f7e70c"
    quizzes += [
        QuizQuestion(lesson_id=finance_lesson, question_text="What does a Profit & Loss (P&L) statement primarily show?",
            options=["A company's assets and liabilities at a given date", "A company's cash inflows and outflows", "A company's revenues, costs, and net profit over a period", "A company's inventory levels"],
            correct_option_index=2,
            explanation="A P&L statement (Income Statement) summarizes revenues, costs, and expenses during a specific period, resulting in net profit or loss. It answers: 'Did the business make money in this period?'"),
        QuizQuestion(lesson_id=finance_lesson, question_text="What is the formula for calculating gross profit?",
            options=["Revenue - Operating Expenses", "Revenue - Cost of Goods Sold", "Net Income + Taxes", "Total Assets - Total Liabilities"],
            correct_option_index=1,
            explanation="Gross Profit = Revenue - Cost of Goods Sold (COGS). It measures how efficiently a company produces its goods before accounting for overhead, taxes, and interest."),
    ]

    # Lesson: How to Manage a Business and Become a Great Leader (capstone)
    leadership_lesson = "a945b803-6e3b-4244-ba73-e1ae974fcc4f"
    assignments += [
        Assignment(lesson_id=leadership_lesson, title="Write a Strategic Business Plan Summary",
            instructions="""Imagine you are launching a small business (any product or service of your choice).

Write a structured 1-page Business Plan Summary covering:

1. Business Idea: Describe your product/service in 2-3 sentences. Who is your target customer?
2. Market Opportunity: What problem does it solve? What is your estimated market size (broad estimate is fine)?
3. Revenue Model: How will you make money? (e.g. subscription, one-time purchase, freemium, service fee)
4. Key Operations: List 3 core operational activities your business will need to run daily.
5. Key Risks: Identify 2 risks and a mitigation strategy for each.
6. Leadership Goal: State one specific leadership principle from this course you would apply in managing your team, and why.

Submit: Your complete business plan summary below."""),
    ]

    # ═══════════════════════════════════════════════════════════════════════
    # COURSE 6: UI/UX Design with Figma
    # ═══════════════════════════════════════════════════════════════════════

    # Lesson: Basics of Figma & UX (Episode 1)
    figma_basics = "d55706cf-fb40-49f3-8f63-7bc98de52d23"
    quizzes += [
        QuizQuestion(lesson_id=figma_basics, question_text="In Figma, what is a 'Frame' used for?",
            options=["Adding a border to any element", "Defining a container that acts as an artboard or screen", "Grouping layers without layout constraints", "Applying a drop shadow to text"],
            correct_option_index=1,
            explanation="In Figma, Frames act as artboards or containers for your designs. They can have fixed dimensions (like a phone screen), constrain child elements, and are the core building block for layouts and prototypes."),
        QuizQuestion(lesson_id=figma_basics, question_text="What does UX stand for?",
            options=["User Experience", "Universal Exchange", "UI Extension", "User Execution"],
            correct_option_index=0,
            explanation="UX stands for User Experience — it encompasses all aspects of the end-user's interaction with a product, system, or service, including how it feels, how easy it is to use, and how enjoyable the interaction is."),
        QuizQuestion(lesson_id=figma_basics, question_text="Which UX research method involves watching real users interact with a product to identify pain points?",
            options=["A/B Testing", "Usability Testing", "Card Sorting", "Affinity Mapping"],
            correct_option_index=1,
            explanation="Usability Testing involves observing real users as they complete tasks with a product. It is one of the most effective methods to identify pain points, confusion, and opportunities for design improvement."),
    ]

    # Lesson: Figma Components & Variants
    components_lesson = "92f09936-576e-4c1d-86ca-aa72f7599049"
    quizzes += [
        QuizQuestion(lesson_id=components_lesson, question_text="What is the advantage of using Figma Components over simple groups?",
            options=["Components load faster", "Editing the main component updates all instances simultaneously", "Components cannot be resized", "Components are only available in paid plans"],
            correct_option_index=1,
            explanation="Figma Components work on a master-instance model: any change to the main component automatically propagates to all instances. This makes design systems scalable and keeps your UI consistent."),
        QuizQuestion(lesson_id=components_lesson, question_text="What are Figma Variants used for?",
            options=["Switching between dark and light mode in the app", "Grouping different states of a component (e.g. Default, Hover, Disabled) into one", "Creating different versions of a whole page", "Exporting components in multiple file formats"],
            correct_option_index=1,
            explanation="Variants allow you to group multiple states or versions of a component (e.g. Button: Default, Hover, Active, Disabled) into a single component set, making it easy to switch between states in a prototype."),
    ]

    # Lesson: How to Prototype on Figma (capstone)
    prototype_lesson = "159375c3-1228-4eaf-b8d0-f506b70c7b50"
    assignments += [
        Assignment(lesson_id=prototype_lesson, title="Design and Prototype a 3-Screen Mobile App Flow",
            instructions="""Using Figma (free account is sufficient), design a simple 3-screen flow for a mobile app of your choice (e.g. a to-do app, food delivery app, or fitness tracker).

Requirements:
1. Screen 1: A home/landing screen with at least a header, one content area, and a call-to-action button.
2. Screen 2: A list or detail screen that the CTA navigates to.
3. Screen 3: A confirmation or completion screen (e.g. order placed, task added).
4. Prototyping: Connect the 3 screens with Figma prototype links so clicking the CTA flows from screen to screen.
5. Components: Use at least one reusable Component (e.g. a button or a card) that appears on multiple screens.

Submit:
- The shareable Figma link to your prototype (set to "Anyone with the link can view").
- A 100-word description of your design decisions: what app did you design, who is the target user, and why did you choose that visual style?"""),
    ]

    # ─── Add all to DB ─────────────────────────────────────────────────────
    for q in quizzes:
        db.add(q)
    for a in assignments:
        db.add(a)

    db.commit()

    print(f"\n=== Seed Complete ===")
    print(f"Quiz questions added: {len(quizzes)}")
    print(f"Assignments added:    {len(assignments)}")
    print(f"\nBreakdown by course:")
    print("  Data Analyst Bootcamp:        3 quizzes (Excel), 3 quizzes (SQL), 1 assignment (Visualization)")
    print("  Excel for HR Professionals:   3 quizzes (Beginner), 1 assignment (Full Course)")
    print("  Web Dev Bootcamp:             3 quizzes (CSS), 2 quizzes (JS vars), 1 assignment (Amazon Clone)")
    print("  Digital Marketing Masterclass:3 quizzes (SEO), 1 quiz (Analytics), 1 assignment (Keyword Research)")
    print("  Business Management:          2 quizzes (Operations), 2 quizzes (Finance), 1 assignment (Leadership)")
    print("  UI/UX Design with Figma:      3 quizzes (Basics), 2 quizzes (Components), 1 assignment (Prototype)")

if __name__ == "__main__":
    main()
