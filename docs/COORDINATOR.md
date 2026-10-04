# Coordinator Role Documentation

## Dashboard Overview
The Coordinator acts as the quality assurance and content management authority for the platform. They review submitted courses, manage categories, moderate reviews, and oversee instructor performance.

### Navigation & Features
Based on the available pages and functionalities, the Coordinator's dashboard includes:
- **Dashboard**: High-level statistics on platform activity (pending approvals, total courses, active instructors).
- **Course Approvals**: A dedicated queue for reviewing courses that instructors have submitted for publication.
- **Course Catalog**: A view of all courses on the platform, regardless of status.
- **Category Manager**: Organizing the platform's taxonomy by creating and editing course categories.
- **Instructors Roster**: Viewing the list of active instructors on the platform.
- **Quality & Reviews**: Moderating student reviews to ensure community guidelines are met.
- **Reports**: Viewing generated reports regarding course performance and platform usage.

---

## Feature-by-Feature Breakdown

### 1. Dashboard (Stats Overview)
- **What it does**: Displays high-level platform statistics for the coordinator (e.g., number of pending courses, total categories, instructor count).
- **User Interaction**: User visits the dashboard landing page. Data is automatically fetched and rendered in charts or stat cards.
- **Backend API Endpoints**:
  - `GET /coordinator/stats`
    - **Purpose**: Fetches aggregate metrics for the dashboard.
    - **Role Restriction**: `coordinator` (or similar, requires verification in `coordinator.py` decorator).

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
  - **Role Restriction**: `coordinator`

### 3. Course Catalog
- **What it does**: A master list of all courses on the platform, allowing the coordinator to search, filter, and view details.
- **User Interaction**: Coordinator uses search bars and filters to find specific courses.
- **Backend API Endpoints**:
  - `GET /coordinator/courses`
    - **Purpose**: Fetches a paginated list of all courses.
    - **Role Restriction**: `coordinator`

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
  - **Role Restriction**: `coordinator`

### 5. Instructor Roster
- **What it does**: Shows a directory of all instructors.
- **User Interaction**: Coordinator views the list, possibly clicking to see an instructor's specific courses.
- **Backend API Endpoints**:
  - `GET /coordinator/instructors`
    - **Purpose**: Retrieves user accounts that have the `instructor` role.
    - **Role Restriction**: `coordinator`

### 6. Quality Reviews (Moderation)
- **What it does**: Allows the coordinator to review and moderate course reviews left by students, specifically looking for inappropriate content.
- **User Interaction**: Coordinator views flagged or all reviews. They can select an action (e.g., 'delete', 'approve', 'hide') to moderate it.
- **Backend API Endpoints**:
  - `GET /coordinator/reviews`
    - **Purpose**: Fetches reviews, often with filters for flagged ones.
  - `PUT /coordinator/reviews/{reviewId}/moderate`
    - **Purpose**: Submits a moderation `{ action }`.
  - **Role Restriction**: `coordinator`

### 7. Reports
- **What it does**: Generates tabular data/reports for platform activity.
- **User Interaction**: Coordinator selects report parameters (like date range or type) and views the paginated results.
- **Backend API Endpoints**:
  - `GET /coordinator/reports`
    - **Purpose**: Fetches paginated reporting data.
    - **Role Restriction**: `coordinator`
