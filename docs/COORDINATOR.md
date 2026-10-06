# Coordinator Role Documentation

## Dashboard Overview
The Coordinator acts as the quality assurance and content management authority for the platform. They review submitted courses, manage categories, moderate reviews, and oversee instructor performance.

### Navigation & Features
Sidebar items (from `CoordinatorSidebarLayout.jsx`), in order:
- **Dashboard** (`/coordinator`): Greeting ("Hello, <first name>"), a real-time date and clock, KPI cards and quick-access widgets.
- **Course Approvals** (`/coordinator/courses/pending`): Queue of courses submitted for publication.
- **Course Catalog** (`/coordinator/courses`): All courses regardless of status; coordinators can also create a course directly.
- **Faculty Management** (`/coordinator/faculty-assignments`): Create instructors, set payout rate and permissions, deactivate/reactivate, and reassign courses between instructors.
- **Assign./Quiz Stats** (`/coordinator/faculty-analytics`): Per-instructor assignment-submission and quiz-attempt statistics.
- **Categories** (`/coordinator/categories`): Course taxonomy.
- **Instructors** (`/coordinator/instructors`): Instructor roster.
- **Quality & Reviews** (`/coordinator/quality-reviews`): Review moderation.
- **Support** (`/coordinator/support`): Raise and track the coordinator's own support tickets (see [SUPPORT_AND_DEPARTMENTS.md](./SUPPORT_AND_DEPARTMENTS.md)).
- **Reports** (`/coordinator/reports`): Platform reports.

> **Layout note**: `App.jsx` wraps every coordinator route in `CoordinatorSidebarLayout` **except** `/coordinator/faculty-analytics`, whose page (`FacultyAnalytics.jsx`) wraps itself. Pages must not wrap themselves when `App.jsx` already does, otherwise two sidebars render (this was the cause of a double-sidebar bug on the dashboard, now fixed).

---

## Feature-by-Feature Breakdown

### 1. Dashboard (Stats Overview)
- **What it does**: Displays high-level platform statistics for the coordinator (pending courses, published courses, instructors, categories, category health). The hero shows "Hello, <first name>" with the current date and a live clock that updates every second.
- **User Interaction**: User visits the dashboard landing page. Data is automatically fetched and rendered in charts or stat cards.
- **Backend API Endpoints**:
  - `GET /coordinator/stats`
    - **Purpose**: Fetches aggregate metrics for the dashboard.
    - **Role Restriction**: `coursecoordinator`

### 2. Course Approvals (The Publishing Workflow)
- **What it does**: Central queue where coordinators evaluate instructor-submitted courses. They can preview the course content and either approve or reject it.
- **User Interaction**:
  - Coordinator sees a list of pending courses.
  - Clicking a course opens a "Preview Modal" (`GET .../preview`) to inspect the curriculum.
  - They click "Approve" (publishes the course) or "Reject" (prompts for a reason, sends it back to Draft).
- **Backend API Endpoints**:
  - `GET /coordinator/courses/pending`
    - **Purpose**: Retrieves all courses with status = `pending_review`.
  - `GET /coordinator/courses/{courseId}/preview`
    - **Purpose**: Loads the full course structure (sections/lessons) so the coordinator can evaluate the quality.
  - `PUT /coordinator/courses/{courseId}/approve`
    - **Purpose**: Changes course status to `published`.
  - `PUT /coordinator/courses/{courseId}/reject`
    - **Purpose**: Requires a `{ reason }` payload, changes status back to `draft`, and typically notifies the instructor.
  - **Role Restriction**: `coursecoordinator`

### 3. Course Catalog
- **What it does**: A master list of all courses on the platform, allowing the coordinator to search, filter, and view details.
- **User Interaction**: Coordinator uses search bars and filters to find specific courses.
- **Backend API Endpoints**:
  - `GET /coordinator/courses`
    - **Purpose**: Fetches a paginated list of all courses.
    - **Role Restriction**: `coursecoordinator`

### 4. Category Manager
- **What it does**: Allows the coordinator to define the categories (e.g., "Web Development", "Data Science") that courses are grouped into.
- **User Interaction**: Coordinator can view a list of categories. Clicking "Add" or "Edit" opens a form to update the name and icon. Clicking "Delete" removes the category.
- **Backend API Endpoints**:
  - `GET /coordinator/categories`
    - **Purpose**: Fetches the category tree.
  - `POST /coordinator/categories`
    - **Purpose**: Creates a new category.
  - `PUT /coordinator/categories/{editingId}`
    - **Purpose**: Updates an existing category.
  - `DELETE /coordinator/categories/{id}`
    - **Purpose**: Removes a category (edge case: cannot delete if courses are attached - requires backend verification).
  - **Role Restriction**: `coursecoordinator`

### 5. Instructor Roster
- **What it does**: Shows a directory of all instructors.
- **User Interaction**: Coordinator views the list, possibly clicking to see an instructor's specific courses.
- **Backend API Endpoints**:
  - `GET /coordinator/instructors`
    - **Purpose**: Retrieves user accounts that have the `instructor` role.
    - **Role Restriction**: `coursecoordinator`

### 6. Quality Reviews (Moderation)
- **What it does**: Allows the coordinator to review and moderate course reviews left by students, specifically looking for inappropriate content.
- **User Interaction**: Coordinator views flagged or all reviews. They can select an action (e.g., 'delete', 'approve', 'hide') to moderate it.
- **Backend API Endpoints**:
  - `GET /coordinator/reviews`
    - **Purpose**: Fetches reviews, often with filters for flagged ones.
  - `PUT /coordinator/reviews/{reviewId}/moderate`
    - **Purpose**: Submits a moderation `{ action }`.
  - **Role Restriction**: `coursecoordinator`

### 7. Reports
- **What it does**: Generates tabular data/reports for platform activity.
- **User Interaction**: Coordinator selects report parameters (like date range or type) and views the paginated results.
- **Backend API Endpoints**:
  - `GET /coordinator/reports`
    - **Purpose**: Fetches paginated reporting data.
    - **Role Restriction**: `coursecoordinator`

### 8. Faculty Management (Instructor Lifecycle)
- **Page**: `FacultyAssignments.jsx`
- **What it does**: Lets the coordinator manage instructors end-to-end: provision accounts, set per-instructor business rules, deactivate/reactivate, and move courses between instructors.
- **Per-instructor settings** (stored on the `users` table):
  - `instructor_payout_rate` — % of course revenue the instructor keeps. `NULL` means the platform default (80% instructor / 20% platform). Used by Accounts when calculating payouts.
  - `can_host_live_classes` — `False` puts the instructor in **Faculty mode**: live-class endpoints return 403.
  - `can_upload_video` — `False` blocks lesson video uploads (403).
- **User Interaction**:
  - "Add instructor" creates the account in Keycloak and the local DB and returns the generated credentials for the coordinator to share.
  - Deactivating an instructor sets `is_active=False`; their courses and content remain intact and can be reassigned.
  - "Assign course" moves a course to another instructor (or discards the assignment). The previous instructor is recorded in `courses.previous_instructor_id`; all sections, lessons, quizzes, assignments and videos stay with the course.
- **Backend API Endpoints**:
  - `POST /coordinator/instructors`, `PUT /coordinator/instructors/{id}`
  - `PUT /coordinator/instructors/{id}/deactivate`, `PUT /coordinator/instructors/{id}/reactivate`
  - `GET /coordinator/instructors/{id}/courses`
  - `POST /coordinator/courses/{courseId}/assign-instructor`, `GET /coordinator/courses/{courseId}/assignment-detail`
  - `POST /coordinator/courses` (coordinator-created draft course, instructor optional)
  - **Role Restriction**: `coursecoordinator`

### 9. Assign./Quiz Stats (Faculty Analytics)
- **Page**: `FacultyAnalytics.jsx`
- **What it does**: For every instructor and each of their courses, shows how many enrolled learners submitted each assignment and how many attempted each quiz.
- **Backend API Endpoints**:
  - `GET /coordinator/faculty-assignments-quizzes`
    - **Role Restriction**: `coursecoordinator`

### 10. Support
- **What it does**: Coordinators can raise tickets (role context `coursecoordinator`) using the two-level category → sub-category form; tickets are routed to a department by the routing rules.
- **Pages**: `/coordinator/support` (list + raise) and `/coordinator/support/:id` (detail + replies), both using `pages/shared/SupportTickets.jsx` / `SupportTicketDetail.jsx`.
- **Backend API Endpoints**: shared `/api/v1/support-tickets/...` (see [SUPPORT_AND_DEPARTMENTS.md](./SUPPORT_AND_DEPARTMENTS.md)).
