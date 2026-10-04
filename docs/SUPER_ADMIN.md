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
- **Support**: (Coming Soon) Ticketing support system.
- **Platform Settings**: (Coming Soon) Updating global platform configurations.
- **Audit Logs**: Viewing security and system logs to track actions taken by other admins.

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
- **What it does**: Ultimate control over all user accounts. Can promote a user to `sub_admin` or `accounts` roles, which Sub Admins typically cannot do to each other.
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

### 7. Platform Settings (Placeholder)
- **What it does**: Will allow dynamic configuration of platform variables.
- **Backend API Endpoints**:
  - `GET /superadmin/settings`
  - `PUT /superadmin/settings`
