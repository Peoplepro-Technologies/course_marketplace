# Super Admin Role Documentation

## Dashboard Overview
The Super Admin has absolute authority over the entire platform. This role can do everything a Sub Admin, Coordinator, or Accounts user can do, plus view audit logs, manage platform settings, and oversee top-level financial summaries.

### Navigation Sidebar
When a Super Admin logs in, they access:
- **Dashboard**: High-level platform KPIs (revenue, users, courses).
- **User Management**: Viewing, editing roles, suspending, and reactivating users.
- **Roles & Permissions**: (Often managed within User Management) Controlling who has what access.
- **Course Management**: Master catalog control, ability to override any course status.
- **Categories**: Managing the platform's course categories.
- **Approvals**: Approving or rejecting pending courses.
- **Payments & Finance**: Read-only oversight of the platform's financial health and master transaction ledger.
- **Reports & Analytics**: Advanced reports and KPI viewing.
- **Reviews & Moderation**: Moderating reviews across the platform.
- **Support** (`/super-admin/support`): Admin inbox for support tickets (list, status change, reply, unread badge).
- **Departments** (`/super-admin/departments`): Create, edit, activate/deactivate and delete departments.
- **Service Requests** (`/super-admin/service-requests`): Platform-wide ticket analytics (KPIs, SLA overdue, filters).
- **Ticket Routing** (`/super-admin/ticket-routing`): Maintain Role → Category → Sub-category → Department routing rules.
- **Platform Settings**: Placeholder page; the `/superadmin/settings` endpoints do not exist yet.
- **Audit Logs**: Viewing security and system logs to track actions taken by other admins.

Sidebar headers are plain text (no icons) across all roles; only the individual nav items carry an icon.

---

## Feature-by-Feature Breakdown

*(Note: Many of these features mirror Sub Admin functionality, but call the `/superadmin` equivalent routes which rely on the `admin` role restriction).*

### 1. Dashboard, Reports & Analytics
- **What it does**: Displays top-level metrics for the platform.
- **Backend API Endpoints**:
  - `GET /superadmin/analytics/kpis`
    - **Purpose**: Fetches system-wide metrics.
    - **Role Restriction**: `admin`

### 2. User Management
- **What it does**: Ultimate control over all user accounts. Can promote a user to `sub_admin` or `accounts` roles, which Sub Admins typically cannot do to each other. Can also assign a user to a **department** (`PUT /superadmin/users/{userId}/department`), which gives that user access to the department queue.
- **Backend API Endpoints**:
  - `GET /superadmin/users`
  - `PUT /superadmin/users/{userId}/role`
  - `PUT /superadmin/users/{userId}/deactivate`
  - `PUT /superadmin/users/{userId}/reactivate`
  - **Role Restriction**: `admin`

### 3. Course Management & Approvals
- **What it does**: Master override for all courses and publishing queues.
- **Backend API Endpoints**:
  - `GET /superadmin/courses`
  - `PUT /superadmin/courses/{courseId}/status`
  - `GET /superadmin/approvals/pending`
  - `PUT /superadmin/approvals/{courseId}/approve`
  - `PUT /superadmin/approvals/{courseId}/reject`
  - **Role Restriction**: `admin`

### 4. Categories & Moderation
- **What it does**: Identical functionality to Coordinator/Sub Admin for categories and reviews.
- **Backend API Endpoints**:
  - `GET /superadmin/categories`, `POST`, `PUT`, `DELETE`
  - `GET /superadmin/reviews`, `PUT /superadmin/reviews/{reviewId}/moderate`
  - **Role Restriction**: `admin`

### 5. Payments & Finance (Oversight)
- **What it does**: Provides a read-only bird's-eye view of financial health, differing from the active operational role of the Accounts team.
- **User Interaction**: Super Admin views high-level revenue metrics and the transaction ledger.
- **Backend API Endpoints**:
  - `GET /superadmin/finance/overview`
    - **Purpose**: Fetches top-level revenue and payout summary.
  - `GET /superadmin/finance/transactions`
    - **Purpose**: Fetches the master ledger of transactions.
  - **Role Restriction**: `admin`

### 6. Audit Logs
- **What it does**: A security feature that allows the Super Admin to trace actions taken by other users (e.g., "SubAdmin X deactivated User Y").
- **User Interaction**: User paginates through a read-only table of system logs.
- **Backend API Endpoints**:
  - `GET /superadmin/audit-logs`
    - **Purpose**: Retrieves paginated system audit logs.
    - **Role Restriction**: `admin`

### 7. Support Inbox
- **Page**: `SASupportTickets.jsx`
- **Backend API Endpoints**: `GET /superadmin/support-tickets`, `GET .../unread-count`, `PUT .../{ticketId}` (status), `POST .../{ticketId}/reply`, `POST .../{ticketId}/read`
- **Role Restriction**: `admin`

### 8. Departments
- **Page**: `SADepartments.jsx`
- **What it does**: Departments own ticket queues. Seeded departments: Accounts/Finance, HR, IT/Technical Support, Academic Team, Academic Operations, Course Coordinator, Student Support, Admin, MIS/Reporting. New departments need no code change.
- **Rules**: a department cannot be deleted while users are assigned (409); deactivate it instead.
- **Backend API Endpoints**: `GET/POST /superadmin/departments`, `PUT/DELETE /superadmin/departments/{deptId}`
- **Role Restriction**: `admin`

### 9. Ticket Routing
- **Page**: `SATicketRouting.jsx`
- **What it does**: Maps `(role_context, category, subcategory)` to a department. The raise-ticket form reads its dropdowns from these rules, so adding a rule immediately adds a new option for that role.
- **Backend API Endpoints**: `GET/POST /superadmin/ticket-routing-rules-v2`, `PUT /superadmin/ticket-routing-rules-v2/{ruleId}`; deletion uses the legacy `DELETE /superadmin/ticket-routing-rules/{ruleId}`.
- **Role Restriction**: `admin`

### 10. Service Requests (Ticket Analytics)
- **Page**: `SAServiceRequests.jsx`
- **What it does**: KPI cards (total / open / in progress / resolved / overdue) and a filterable ticket table. Overdue SLA: high 72h, medium 120h, low 168h from creation while the ticket is open or in progress.
- **Backend API Endpoints**: `GET /support-tickets/analytics` (filters: role, department_id, category, priority, status, date_from, date_to), `GET /superadmin/departments`
- **Role Restriction**: `admin`

### 11. Platform Settings (Placeholder)
- **What it does**: `SASettings.jsx` is a placeholder. It calls `GET/PUT /superadmin/settings`, which are **not implemented** in `superadmin.py`.
