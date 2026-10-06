# Sub Admin Role Documentation

## Dashboard Overview
The Sub Admin role has delegated administrative powers to manage users, courses, and platform categories. They assist the Super Admin by handling day-to-day operations and moderation tasks, but might not have access to higher-level financial operations.

### Navigation Sidebar
When a Sub Admin logs in, they access:
- **Dashboard**: High-level platform KPIs.
- **User Management**: Viewing and managing user roles and account statuses.
- **Course Management**: Viewing the master list of all courses and forcing status changes if needed.
- **Categories**: Managing the platform's course categories.
- **Approvals**: Reviewing pending course submissions (similar to a Coordinator).
- **Reviews & Moderation**: Moderating student reviews for compliance.
- **Support**: Admin inbox for support tickets (`/sub-admin/support`).
- **Reports**: Viewing platform analytics and KPIs.

---

## Feature-by-Feature Breakdown

### 1. Dashboard & Reports (KPIs)
- **What it does**: Displays aggregate metrics (total users, total active courses, etc.) for the Sub Admin to gauge platform health.
- **User Interaction**: Sub Admin lands on the dashboard and sees KPI cards.
- **Backend API Endpoints**:
  - `GET /subadmin/analytics/kpis`
    - **Purpose**: Fetches basic platform metrics.
    - **Role Restriction**: `sub_admin`

### 2. User Management
- **What it does**: Allows the Sub Admin to view a list of all registered users, change their roles (e.g., upgrading a learner to an instructor), and deactivate/reactivate accounts.
- **User Interaction**: User searches or scrolls the user list. They can click "Edit Role" to submit a role change, or "Deactivate" to suspend a user.
- **Backend API Endpoints**:
  - `GET /subadmin/users`
    - **Purpose**: Fetches all users (often paginated/filterable).
  - `PUT /subadmin/users/{userId}/role`
    - **Purpose**: Changes a user's role (e.g., `{ role: 'instructor' }`).
  - `PUT /subadmin/users/{userId}/deactivate`
    - **Purpose**: Soft-deletes or suspends an account.
  - `PUT /subadmin/users/{userId}/reactivate`
    - **Purpose**: Re-activates a previously deactivated account.
  - **Role Restriction**: `sub_admin`

### 3. Course Management
- **What it does**: A master catalog where the Sub Admin can view every course on the platform and unilaterally override its status (e.g., taking down a published course for a violation).
- **User Interaction**: Sub Admin views the list of courses, selects a course, and changes its status.
- **Backend API Endpoints**:
  - `GET /subadmin/courses`
    - **Purpose**: Retrieves all courses.
  - `PUT /subadmin/courses/{courseId}/status`
    - **Purpose**: Overrides the status `{ status: 'draft' | 'published' | 'suspended' }`.
  - **Role Restriction**: `sub_admin`

### 4. Categories
- **What it does**: Managing course categories (identical to Coordinator permissions).
- **User Interaction**: Creating, updating, or deleting categories.
- **Backend API Endpoints**:
  - `GET /subadmin/categories`
  - `POST /subadmin/categories`
  - `PUT /subadmin/categories/{id}`
  - `DELETE /subadmin/categories/{id}`
  - **Role Restriction**: `sub_admin`

### 5. Approvals
- **What it does**: Sub Admins can act as backup Coordinators, approving or rejecting pending courses.
- **User Interaction**: Reviewing the pending queue and actioning them.
- **Backend API Endpoints**:
  - `GET /subadmin/approvals/pending`
  - `PUT /subadmin/approvals/{courseId}/approve`
  - `PUT /subadmin/approvals/{courseId}/reject`
  - **Role Restriction**: `sub_admin`

### 6. Reviews & Moderation
- **What it does**: Sub Admins can moderate reviews to ensure content guidelines are met.
- **User Interaction**: Viewing flagged reviews and deleting or approving them.
- **Backend API Endpoints**:
  - `GET /subadmin/reviews`
  - `PUT /subadmin/reviews/{reviewId}/moderate`
  - **Role Restriction**: `sub_admin`

### 7. Support Inbox
- **Page**: `SubAdminSupportTickets.jsx`
- **What it does**: View tickets, change status, reply and clear the unread badge.
- **Backend API Endpoints**:
  - `GET /subadmin/support-tickets`, `GET /subadmin/support-tickets/unread-count`
  - `PUT /subadmin/support-tickets/{ticketId}` (status)
  - `POST /subadmin/support-tickets/{ticketId}/reply`, `POST /subadmin/support-tickets/{ticketId}/read`
  - **Role Restriction**: `sub_admin`
