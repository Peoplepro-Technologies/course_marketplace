"""
seed_departments_and_routing.py

Seeds:
  1. Departments (9 initial departments)
  2. TicketRoutingRules (two-level category/subcategory → department)

Run: cd backend && python seed_departments_and_routing.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.department import Department
from app.models.ticket_routing_rule import TicketRoutingRule
import uuid
from datetime import datetime, timezone

db = SessionLocal()

# ── 1. Seed Departments ────────────────────────────────────────────────
DEPARTMENTS = [
    "Accounts/Finance",
    "HR",
    "IT/Technical Support",
    "Academic Team",
    "Academic Operations",
    "Course Coordinator",
    "Student Support",
    "Admin",
    "MIS/Reporting",
]

dept_map = {}  # name → id
for name in DEPARTMENTS:
    existing = db.query(Department).filter(Department.name == name).first()
    if not existing:
        dept = Department(
            id=uuid.uuid4(),
            name=name,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(dept)
        db.flush()
        dept_map[name] = dept.id
        print(f"  Created department: {name}")
    else:
        dept_map[name] = existing.id
        print(f"  Exists department: {name}")

db.commit()

# ── 2. Seed Routing Rules ──────────────────────────────────────────────
# (role_context, category, subcategory, department_name)
RULES = [
    # Learner
    ("learner", "Payment & Refund",         "Refund request",          "Accounts/Finance"),
    ("learner", "Payment & Refund",         "Payment failed",           "Accounts/Finance"),
    ("learner", "Payment & Refund",         "Invoice/receipt",          "Accounts/Finance"),
    ("learner", "Live Classes",             "Class link not received",  "Academic Operations"),
    ("learner", "Live Classes",             "Class schedule issue",     "Course Coordinator"),
    ("learner", "Live Classes",             "Recording unavailable",    "Academic Operations"),
    ("learner", "Technical Support",        "Login issue",              "IT/Technical Support"),
    ("learner", "Technical Support",        "Video not playing",        "IT/Technical Support"),
    ("learner", "Course & Enrollment",      "Course access",            "Course Coordinator"),
    ("learner", "Course & Enrollment",      "Course transfer",          "Course Coordinator"),
    ("learner", "Assignments & Assessments","Assignment issue",         "Academic Team"),
    ("learner", "Assignments & Assessments","Quiz issue",               "Academic Team"),
    ("learner", "Certificate",              "Certificate not generated","Academic Operations"),
    ("learner", "Certificate",              "Name correction",          "Academic Operations"),
    ("learner", "Attendance",               "Attendance correction",    "Course Coordinator"),
    ("learner", "Account & Profile",        "Email/phone update",       "Student Support"),
    ("learner", "Feedback & Complaints",    "Instructor complaint",     "Course Coordinator"),
    # Instructor
    ("instructor", "Payment & Salary",      "Salary/payment issue",     "Accounts/Finance"),
    ("instructor", "Payment & Salary",      "Payment delay",            "Accounts/Finance"),
    ("instructor", "Payment & Salary",      "Payment statement",        "Accounts/Finance"),
    ("instructor", "Leave & Availability",  "Leave request",            "HR"),
    ("instructor", "Leave & Availability",  "Class unavailability",     "Course Coordinator"),
    ("instructor", "Medical/Emergency",     "Medical leave",            "HR"),
    ("instructor", "Medical/Emergency",     "Emergency absence",        "HR"),
    ("instructor", "Course & Content",      "Content update",           "Academic Team"),
    ("instructor", "Course & Content",      "Content upload",           "Academic Operations"),
    ("instructor", "Live Classes",          "Class scheduling",         "Course Coordinator"),
    ("instructor", "Live Classes",          "Class link issue",         "IT/Technical Support"),
    ("instructor", "Technical Support",     "Login issue",              "IT/Technical Support"),
    ("instructor", "Technical Support",     "Dashboard issue",          "IT/Technical Support"),
    ("instructor", "Learner Management",    "Attendance correction",    "Course Coordinator"),
    ("instructor", "Learner Management",    "Learner issue",            "Course Coordinator"),
    ("instructor", "Performance & Feedback","Performance query",        "HR"),
    ("instructor", "Contract & HR",         "Contract/documentation",   "HR"),
    ("instructor", "Resources & Equipment", "Software/equipment request","Admin"),
    # Course Coordinator
    ("coursecoordinator", "Course Management",    "Create/update course",   "Academic Operations"),
    ("coursecoordinator", "Course Management",    "Course closure",         "Academic Operations"),
    ("coursecoordinator", "Instructor Management","Assign instructor",      "Academic Operations"),
    ("coursecoordinator", "Instructor Management","Instructor replacement",  "Academic Operations"),
    ("coursecoordinator", "Learner Management",   "Enrollment issue",       "Student Support"),
    ("coursecoordinator", "Learner Management",   "Batch transfer",         "Academic Operations"),
    ("coursecoordinator", "Scheduling",           "Batch timing change",    "Academic Operations"),
    ("coursecoordinator", "Scheduling",           "Class rescheduling",     "Academic Operations"),
    ("coursecoordinator", "Content Management",   "Content approval",       "Academic Team"),
    ("coursecoordinator", "Assessment",           "Assessment issue",       "Academic Team"),
    ("coursecoordinator", "Attendance",           "Attendance correction",  "Academic Operations"),
    ("coursecoordinator", "Certificate",          "Certificate issue",      "Academic Operations"),
    ("coursecoordinator", "Reports & Analytics",  "Course report",          "MIS/Reporting"),
    ("coursecoordinator", "Technical Support",    "Dashboard/system issue", "IT/Technical Support"),
    ("coursecoordinator", "Operations",           "Batch creation",         "Academic Operations"),
]

added = 0
skipped = 0
for role, category, subcategory, dept_name in RULES:
    dept_id = dept_map.get(dept_name)
    if not dept_id:
        print(f"  WARNING: dept not found: {dept_name}")
        continue

    existing = db.query(TicketRoutingRule).filter(
        TicketRoutingRule.role_context == role,
        TicketRoutingRule.category == category,
        TicketRoutingRule.subcategory == subcategory,
    ).first()

    if not existing:
        rule = TicketRoutingRule(
            id=uuid.uuid4(),
            role_context=role,
            category=category,
            subcategory=subcategory,
            department_id=dept_id,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(rule)
        added += 1
    else:
        # Update department if changed
        if existing.department_id != dept_id:
            existing.department_id = dept_id
        skipped += 1

db.commit()
db.close()

print(f"\nSeed complete: {len(DEPARTMENTS)} departments, {added} rules added, {skipped} rules already existed.")
