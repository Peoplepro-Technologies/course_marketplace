# Support Tickets, Departments & Staff Portal

> Derived from `backend/app/routers/support.py`, `superadmin.py`, `models/department.py`, `models/support_ticket.py`, `models/ticket_routing_rule.py`, `auth/keycloak.py`, and the frontend files under `pages/shared/` and `pages/superadmin/`.

Support is **department-driven**. A ticket is routed by the raiser's role, a category and a sub-category to a **department**. Anyone assigned to that department works the ticket from one generic queue, so adding a department needs no new code.

---

> Per-department details (which categories and sub-categories each department receives) are in [DEPARTMENT_ROLES.md](./DEPARTMENT_ROLES.md).

---

## 1. Concepts

| Concept | Where | Notes |
|---|---|---|
| **Department** | `departments` table | `name` (unique), `description`, `is_active`. Seeded: Accounts/Finance, HR, IT/Technical Support, Academic Team, Academic Operations, Course Coordinator, Student Support, Admin, MIS/Reporting |
| **Routing rule** | `ticket_routing_rules` | `(role_context, category, subcategory) → department_id`, plus `is_active`. Legacy columns `assigned_role`, `assignee_name`, `assignee_email` are kept but no longer used for routing |
| **Ticket** | `support_tickets` | `ticket_number` (`SR001`, `SR002`, …) with `sr_sequence`, `role_context`, `category`, `subcategory`, `subject`, `description`, `department_id`, `assigned_team` (legacy), `status`, `priority`, `assigned_to_id`, `last_activity_at/by` |
| **Reply** | `ticket_replies` | `ticket_id`, `author_id`, `message` |
| **Read marker** | `ticket_reads` | `(ticket_id, user_id, last_read_at)` drives the unread badge |
| **User → department** | `users.department_id` | Set by Super Admin. Any user with a department can open the department queue |

Statuses: `open`, `in_progress`, `resolved`, `cancelled` (the code also treats `closed` like `resolved`). Priorities: `low`, `medium`, `high`.

---

## 2. Who can raise tickets

`POST /api/v1/support-tickets` accepts roles `learner`, `instructor` and `coursecoordinator`. The routing rules are keyed on the same three role contexts. The seed script (`backend/seed_departments_and_routing.py`) creates the rules:

- **Learner**: Payment & Refund, Live Classes, Technical Support, Course & Enrollment, Assignments & Assessments, Certificate, Attendance, Account & Profile, Feedback & Complaints
- **Instructor**: Payment & Salary, Leave & Availability, Medical/Emergency, Course & Content, Live Classes, Technical Support, Learner Management, Performance & Feedback, Contract & HR, Resources & Equipment
- **Course Coordinator**: Course Management, Instructor Management, Learner Management, Scheduling, Content Management, Assessment, Attendance, Certificate, Reports & Analytics, Technical Support, Operations

Each (category, sub-category) pair maps to one department. Examples: learner "Payment & Refund / Refund request" → Accounts/Finance; instructor "Leave & Availability / Leave request" → HR; coordinator "Reports & Analytics / Course report" → MIS/Reporting.

---

## 3. Raising a ticket (flow)

1. The form calls `GET /support-tickets/routing-options` → categories for the caller's role.
2. After a category is chosen it calls `GET /support-tickets/routing-options?category=X` → sub-categories (each with its department name).
3. `POST /support-tickets` with `category`, `subcategory`, `subject`, `description`, `priority`.
4. The server finds the active rule for `(role, category, subcategory)`. If there is no exact match it falls back to the first active rule for `(role, category)`. If nothing matches, `department_id` stays `NULL` and the legacy `assigned_team` falls back to `"admin"`.
5. `ticket_number` is generated as `SR` + zero-padded `max(sr_sequence)+1`. An audit log row `ticket_created` is written.

---

## 4. Working a ticket

### 4.1 Raiser
Pages: `/learner/support`, `/instructor/support`, `/coordinator/support` (list + raise form, `pages/shared/SupportTickets.jsx`) and the matching `/…/support/:id` detail (`SupportTicketDetail.jsx`). Raisers can only see their own tickets. A reply on a resolved ticket re-opens it.

### 4.2 Department staff (the generic queue)
Endpoints under `/support-tickets/department-queue` (all require `users.department_id`; otherwise 403 "You are not assigned to any department"):

| Action | Endpoint |
|---|---|
| List (filters `status`, `priority`, `category`) | `GET /support-tickets/department-queue` |
| Detail with replies | `GET /support-tickets/department-queue/{id}` |
| Change status / assignee | `PUT /support-tickets/department-queue/{id}` |
| Reply | `POST /support-tickets/department-queue/{id}/reply` (a resolved/closed ticket moves to `in_progress`) |
| Mark read | `POST /support-tickets/department-queue/{id}/read` |

A ticket outside the caller's department returns 403.

### 4.3 Admin roles
- **Accounts** (`/accounts/support`) sees tickets where legacy `assigned_team == "accounts"` **or** the department name contains "finance"/"accounts".
- **Sub Admin** and **Super Admin** have their own inbox endpoints (`/subadmin/support-tickets`, `/superadmin/support-tickets`).
- Super Admin additionally has analytics (§6).

### 4.4 Unread badge
`unread` = `last_activity_at > last_read_at` and `last_activity_by != current user`. `GET …/unread-count` feeds the sidebar `SupportBadgeLink`.

---

## 5. Staff portal (department users)

**Role**: A user whose Keycloak realm roles include `staff` (and none of the higher roles) gets the DB/local role `staff` (`get_current_user` priority: super_admin > admin > sub_admin > coursecoordinator > accounts > instructor > staff > learner).

**Auth plumbing**
- `AuthProvider.jsx` calls `GET /api/v1/me` after login and stores `department_id` and `department_name` on the user; `primaryRole` becomes `staff` when the token has the `staff` role.
- `Navbar.jsx` shows a link to `/staff` labelled with the department name for `staff` users (the brand is a plain "CourseHub" wordmark).

**Routes** (`App.jsx`, `ProtectedRoute role="any"`)
- `/staff` and `/staff/*` → `StaffDashboard.jsx`
- `/department-queue` → `DepartmentQueue.jsx` (standalone table + detail/reply view)

**Layout**: `StaffSidebarLayout.jsx` is identical for every department. The header shows the department name (from `user.department_name`) and "Staff Portal" as plain text; an accent colour is chosen from the department name (blue for finance/accounts, pink for HR, indigo for IT, amber for academic, green for student support, purple for MIS/reporting, cyan for course coordination, default indigo). Sidebar entries: Dashboard (`/staff`), My Queue (`/staff/queue`), All Tickets (`/staff/all`), Resolved (`/staff/resolved`). The sidebar can be collapsed.

**Dashboard**: KPI cards (total / open / in progress / resolved) computed from the unfiltered queue, status and priority filters, search, and a ticket drawer with replies and a status selector.

**Creating staff users**
1. Create a department (Super Admin → Departments) and routing rules, or run `python seed_departments_and_routing.py`.
2. Create the Keycloak user with the `staff` realm role. `backend/create_dept_users.py` creates test users (`testacademicoperations`, `testacademicteam`, `testhr`, `testittechnicalsupport`, `testmisreporting`, `teststudentsupport`, password `testpass`) and assigns their department.
3. Or assign an existing user from Super Admin → User Management (`PUT /superadmin/users/{id}/department`).

---

## 6. Super Admin tooling

| Page | Route | Purpose |
|---|---|---|
| `SADepartments.jsx` | `/super-admin/departments` | CRUD departments. Delete is blocked (409) while users are assigned; deactivate instead |
| `SATicketRouting.jsx` | `/super-admin/ticket-routing` | CRUD routing rules (`-v2` endpoints; delete uses the legacy delete route) |
| `SAServiceRequests.jsx` | `/super-admin/service-requests` | Analytics: KPIs + filtered list from `GET /support-tickets/analytics` |
| `SASupportTickets.jsx` | `/super-admin/support` | Admin inbox |

**SLA / overdue** (analytics): open or in-progress tickets older than 72h (high), 120h (medium) or 168h (low) count as overdue.

---

## 7. Data-model summary

```
departments 1───* users            (users.department_id, SET NULL on delete)
departments 1───* ticket_routing_rules
departments 1───* support_tickets
users       1───* support_tickets  (raised_by_id, assigned_to_id)
support_tickets 1───* ticket_replies
support_tickets 1───* ticket_reads
```

Migration: `backend/alembic/versions/ad3021b74d09_add_departments_and_service_request_.py`.

> **Branches**: an earlier migration (`e5d91fecfd6e_add_branches_and_org_logic.py`) added `users.branch_id` and `ticket_routing_rules.branch_id`, but there is no `Branch` model in `backend/app/models/` at present, so the branch system is not active in the current code. Department routing replaced it.
