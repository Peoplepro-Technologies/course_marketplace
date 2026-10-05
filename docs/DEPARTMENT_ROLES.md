# Department Roles (Support Ticket Owners)

> Every department below owns a ticket queue. The routing data comes from `backend/seed_departments_and_routing.py` (the initial rules); Super Admin can change, add or disable any rule at runtime in **Ticket Routing**, so the live database may differ from this list.
>
> All department users share one portal and one set of endpoints. See [SUPPORT_AND_DEPARTMENTS.md](./SUPPORT_AND_DEPARTMENTS.md) for the routing model and [API_REFERENCE.md](./API_REFERENCE.md) for endpoints.

## Overview

| Department | Rules | Receives tickets from | Who works the queue |
|---|---|---|---|
| Accounts/Finance | 6 | Learner, Instructor | Accounts role (`/accounts`) or a staff user assigned to this department |
| HR | 5 | Instructor | Staff user, department "HR" |
| IT/Technical Support | 6 | Learner, Instructor, Course Coordinator | Staff user, department "IT/Technical Support" |
| Academic Team | 5 | Learner, Instructor, Course Coordinator | Staff user, department "Academic Team" |
| Academic Operations | 15 | Learner, Instructor, Course Coordinator | Staff user, department "Academic Operations" |
| Course Coordinator | 9 | Learner, Instructor | Course Coordinator role or a staff user assigned to this department |
| Student Support | 2 | Learner, Course Coordinator | Staff user, department "Student Support" |
| Admin | 1 | Instructor | Staff user assigned to "Admin" (Super Admin / Sub Admin inboxes also see unrouted tickets) |
| MIS/Reporting | 1 | Course Coordinator | Staff user, department "MIS/Reporting" |

## What every department user can do

Any user with `users.department_id` set (Keycloak realm role `staff`) gets the same portal. Nothing is hard-coded per department.

- **Dashboard** (`/staff`): KPI cards (Total, Open, In Progress, Resolved, High Priority), status and priority filters, search.
- **My Queue / All Tickets / Resolved** (`/staff/queue`, `/staff/all`, `/staff/resolved`).
- **Ticket drawer**: read the ticket and its replies, change status (`open`, `in_progress`, `resolved`, `cancelled`) and reply. The API also accepts `assigned_to_id` for assignment.
- **Read tracking**: opening a ticket clears its unread badge for that user.
- **Scope**: a user only sees and updates tickets whose `department_id` equals their own; other tickets return 403.
- **Endpoints**: `GET /support-tickets/department-queue`, `GET|PUT /support-tickets/department-queue/{id}`, `POST .../reply`, `POST .../read`, and `GET /me` for the department name.

---

## Accounts/Finance

- **Who works it**: Accounts role (`/accounts`) or a staff user assigned to this department
- **Where**: The Accounts dashboard lists these tickets through `/accounts/support` (legacy `assigned_team="accounts"` tickets plus any department whose name contains "finance" or "accounts"). A `staff` user assigned here uses the generic Staff Portal.
- **Routing rules**: 6

| Raised by | Category | Sub-categories |
|---|---|---|
| Learner | Payment & Refund | Refund request, Payment failed, Invoice/receipt |
| Instructor | Payment & Salary | Salary/payment issue, Payment delay, Payment statement |

## HR

- **Who works it**: Staff user, department "HR"
- **Where**: Staff Portal (`/staff`)
- **Test login** (created by `create_dept_users.py`): `testhr / testpass`
- **Routing rules**: 5

| Raised by | Category | Sub-categories |
|---|---|---|
| Instructor | Leave & Availability | Leave request |
| Instructor | Medical/Emergency | Medical leave, Emergency absence |
| Instructor | Performance & Feedback | Performance query |
| Instructor | Contract & HR | Contract/documentation |

## IT/Technical Support

- **Who works it**: Staff user, department "IT/Technical Support"
- **Where**: Staff Portal (`/staff`)
- **Test login** (created by `create_dept_users.py`): `testittechnicalsupport / testpass`
- **Routing rules**: 6

| Raised by | Category | Sub-categories |
|---|---|---|
| Learner | Technical Support | Login issue, Video not playing |
| Instructor | Live Classes | Class link issue |
| Instructor | Technical Support | Login issue, Dashboard issue |
| Course Coordinator | Technical Support | Dashboard/system issue |

## Academic Team

- **Who works it**: Staff user, department "Academic Team"
- **Where**: Staff Portal (`/staff`)
- **Test login** (created by `create_dept_users.py`): `testacademicteam / testpass`
- **Routing rules**: 5

| Raised by | Category | Sub-categories |
|---|---|---|
| Learner | Assignments & Assessments | Assignment issue, Quiz issue |
| Instructor | Course & Content | Content update |
| Course Coordinator | Content Management | Content approval |
| Course Coordinator | Assessment | Assessment issue |

## Academic Operations

- **Who works it**: Staff user, department "Academic Operations"
- **Where**: Staff Portal (`/staff`)
- **Test login** (created by `create_dept_users.py`): `testacademicoperations / testpass`
- **Routing rules**: 15

| Raised by | Category | Sub-categories |
|---|---|---|
| Learner | Live Classes | Class link not received, Recording unavailable |
| Learner | Certificate | Certificate not generated, Name correction |
| Instructor | Course & Content | Content upload |
| Course Coordinator | Course Management | Create/update course, Course closure |
| Course Coordinator | Instructor Management | Assign instructor, Instructor replacement |
| Course Coordinator | Learner Management | Batch transfer |
| Course Coordinator | Scheduling | Batch timing change, Class rescheduling |
| Course Coordinator | Attendance | Attendance correction |
| Course Coordinator | Certificate | Certificate issue |
| Course Coordinator | Operations | Batch creation |

## Course Coordinator

- **Who works it**: Course Coordinator role or a staff user assigned to this department
- **Where**: Tickets routed here are answered from the department queue by a staff user assigned to "Course Coordinator". Note that the Coordinator role itself (`/coordinator`) has no inbox for tickets raised by others; it only raises its own tickets.
- **Routing rules**: 9

| Raised by | Category | Sub-categories |
|---|---|---|
| Learner | Live Classes | Class schedule issue |
| Learner | Course & Enrollment | Course access, Course transfer |
| Learner | Attendance | Attendance correction |
| Learner | Feedback & Complaints | Instructor complaint |
| Instructor | Leave & Availability | Class unavailability |
| Instructor | Live Classes | Class scheduling |
| Instructor | Learner Management | Attendance correction, Learner issue |

## Student Support

- **Who works it**: Staff user, department "Student Support"
- **Where**: Staff Portal (`/staff`)
- **Test login** (created by `create_dept_users.py`): `teststudentsupport / testpass`
- **Routing rules**: 2

| Raised by | Category | Sub-categories |
|---|---|---|
| Learner | Account & Profile | Email/phone update |
| Course Coordinator | Learner Management | Enrollment issue |

## Admin

- **Who works it**: Staff user assigned to "Admin" (Super Admin / Sub Admin inboxes also see unrouted tickets)
- **Where**: Staff Portal for the department; Super Admin and Sub Admin inboxes handle legacy and unrouted (`department_id` NULL, `assigned_team="admin"`) tickets.
- **Routing rules**: 1

| Raised by | Category | Sub-categories |
|---|---|---|
| Instructor | Resources & Equipment | Software/equipment request |

## MIS/Reporting

- **Who works it**: Staff user, department "MIS/Reporting"
- **Where**: Staff Portal (`/staff`)
- **Test login** (created by `create_dept_users.py`): `testmisreporting / testpass`
- **Routing rules**: 1

| Raised by | Category | Sub-categories |
|---|---|---|
| Course Coordinator | Reports & Analytics | Course report |

---

## Adding another department

1. Super Admin → **Departments** → create it (`POST /superadmin/departments`).
2. Super Admin → **Ticket Routing** → add rules `(role, category, sub-category) → department` (`POST /superadmin/ticket-routing-rules-v2`). The raise-ticket dropdowns pick them up immediately.
3. Create a Keycloak user with the `staff` realm role and assign the department (Super Admin → User Management, or `PUT /superadmin/users/{id}/department`).
4. No frontend or backend code changes are needed.
