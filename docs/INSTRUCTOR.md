# Instructor Role Documentation

## Dashboard Overview
The Instructor Dashboard is the central interface for content creators. It allows instructors to build courses, manage students, track earnings, and engage with their audience.

### Navigation Sidebar
When an instructor logs in, they see the following items in their navigation sidebar:
- **Dashboard**: High-level overview of their courses.
- **My Courses**: Detailed course management, including course creation and editing.
- **Submissions & Status**: Tracking the approval status of their courses (e.g., pending coordinator review).
- **Students**: Managing student enrollments and viewing their progress.
- **Earnings**: Financial dashboard showing generated revenue.
- **Live Classes**: Scheduling and managing live sessions for their courses.
- **Reviews**: Reading and replying to student reviews.
- **Assignments/Quiz** (`/instructor/analytics`): Assignment submission and quiz attempt statistics for the instructor's own courses.
- **Support**: Ticketing system to get help from platform administrators.
- **Profile & Payout**: Updating personal information and payout details.

---

## Feature-by-Feature Breakdown

### 1. Dashboard & Course Management
- **What it does**: Allows instructors to view their courses, create new ones, edit existing ones, and manage the curriculum (sections and lessons).
- **User Interaction**: Instructor clicks "My Courses" or views the main dashboard to see their courses. They can click "Create Course" to open the `CourseForm`, or edit an existing course which leads them to the `SectionManager` to add sections and the `LessonForm` to add specific lessons/videos/quizzes.
- **Backend API Endpoints**:
  - `GET /instructor/courses` 
    - **Purpose**: Fetches all courses authored by the current instructor.
    - **Role Restriction**: `instructor`
  - `POST /instructor/courses`
    - **Purpose**: Creates a new course draft.
    - **Role Restriction**: `instructor`
  - `GET /instructor/courses/{courseId}`
    - **Purpose**: Retrieves details of a specific course, including its sections and lessons.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/courses/{courseId}`
    - **Purpose**: Updates basic course details.
    - **Role Restriction**: `instructor`
  - `POST /instructor/courses/{courseId}/upload-thumbnail`
    - **Purpose**: Uploads an image thumbnail for the course.
    - **Role Restriction**: `instructor`
  - `DELETE /instructor/courses/{courseId}`
    - **Purpose**: Deletes a course (typically only if un-published or draft).
    - **Role Restriction**: `instructor`
  - `PUT /instructor/courses/{courseId}/publish`
    - **Purpose**: Submits a draft course for review/approval by a coordinator.
    - **Role Restriction**: `instructor`

### 2. Curriculum Building (Sections & Lessons)
- **What it does**: Instructors build out the structure of their course by adding sections, lessons, quizzes, and assignments.
- **User Interaction**: Inside the `SectionManager`, instructors can add sections. Under each section, they click to add a lesson (`LessonForm`), where they define the content (video URL, article, etc.) and optionally add quiz questions or assignments.
- **Backend API Endpoints**:
  - `POST /instructor/courses/{courseId}/sections`
    - **Purpose**: Creates a new section within a course.
    - **Role Restriction**: `instructor`
  - `DELETE /instructor/sections/{sectionId}`
    - **Purpose**: Deletes a section.
    - **Role Restriction**: `instructor`
  - `POST /instructor/sections/{sectionId}/lessons`
    - **Purpose**: Creates a new lesson inside a section.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/lessons/{lessonId}`
    - **Purpose**: Updates a lesson's content.
    - **Role Restriction**: `instructor`
  - `DELETE /instructor/lessons/{lessonId}`
    - **Purpose**: Deletes a lesson.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/lessons/{lessonId}/toggle-preview`
    - **Purpose**: Toggles whether a lesson is available for free preview.
    - **Role Restriction**: `instructor`
  - `POST /instructor/lessons/{lessonId}/upload-thumbnail`
    - **Purpose**: Uploads a video thumbnail for the lesson.
    - **Role Restriction**: `instructor`
  - `POST /instructor/lessons/{lessonId}/quiz-questions` / `PUT ...` / `DELETE ...`
    - **Purpose**: CRUD operations for quiz questions attached to a lesson.
    - **Role Restriction**: `instructor`
  - `POST /instructor/lessons/{lessonId}/assignments` / `PUT ...` / `DELETE ...`
    - **Purpose**: CRUD operations for assignments attached to a lesson.
    - **Role Restriction**: `instructor`

### 2b. Coordinator-controlled permissions ("Faculty mode")
Two flags on the instructor's user record are set by the Coordinator and enforced by the backend:
- `can_upload_video = False` → `POST /instructor/lessons/{lessonId}/upload-video` returns 403.
- `can_host_live_classes = False` → scheduling, starting, ending and deleting live classes return 403.

The instructor's payout share is `instructor_payout_rate` (percent, nullable). `NULL` means the platform default of 80%. A coordinator can also reassign any course to another instructor; the content stays with the course and the earlier instructor is recorded as `previous_instructor_id`.

### 2c. Assignments/Quiz Stats
- **Page**: `InstructorAnalytics.jsx`
- **Backend API Endpoints**:
  - `GET /instructor/my-assignments-quizzes` — per course: enrolled count, submissions per assignment, attempts per quiz.
  - **Role Restriction**: `instructor`

### 3. Submissions & Status
- **What it does**: Shows the instructor the approval status of their courses (e.g., Draft, Pending Review, Approved, Rejected).
- **User Interaction**: Instructor views the list to track progress.
- **Backend API Endpoints**:
  - `GET /instructor/courses`
    - **Purpose**: Re-uses the courses endpoint but specifically filters or displays the `status` field.
    - **Role Restriction**: `instructor`

### 4. Students
- **What it does**: Allows the instructor to see enrolled students, track their progress, and manually approve/reject enrollments if the course requires it.
- **User Interaction**: Instructor views a table of students. They can click to approve or reject pending enrollments.
- **Backend API Endpoints**:
  - `GET /instructor/courses/{courseId}/students` (implied by dynamic endpoint call)
    - **Purpose**: Fetches the list of students for a course.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/enrollments/{enrollmentId}/approve`
    - **Purpose**: Approves a student's pending enrollment.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/enrollments/{enrollmentId}/reject`
    - **Purpose**: Rejects a student's pending enrollment.
    - **Role Restriction**: `instructor`

### 5. Earnings
- **What it does**: Displays financial charts and transaction history for the instructor's sales.
- **User Interaction**: Instructor views visual charts tracking their revenue over time.
- **Backend API Endpoints**:
  - `GET /instructor/earnings`
    - **Purpose**: Retrieves earnings data for the chart and summaries.
    - **Role Restriction**: `instructor`

### 6. Live Classes
- **What it does**: Allows the instructor to schedule, start, and end live video sessions for specific courses, as well as upload recordings afterward.
- **User Interaction**: Instructor clicks "Schedule Class", selects a course, and sets a time. They can click "Start" when ready, "End" when finished, and then "Upload Recording".
- **Backend API Endpoints**:
  - `GET /instructor/live-classes`
    - **Purpose**: Fetches scheduled live classes for the instructor.
    - **Role Restriction**: `instructor`
  - `POST /instructor/courses/{courseId}/live-classes`
    - **Purpose**: Schedules a new live class.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/live-classes/{lc.id}/start`
    - **Purpose**: Marks a live class as 'started' (often generating a join link/recording trigger).
    - **Role Restriction**: `instructor`
  - `PUT /instructor/live-classes/{lc.id}/end`
    - **Purpose**: Marks a live class as 'ended'.
    - **Role Restriction**: `instructor`
  - `DELETE /instructor/live-classes/{lc.id}`
    - **Purpose**: Cancels/deletes a live class.
    - **Role Restriction**: `instructor`
  - `POST /instructor/live-classes/{liveClassId}/recording`
    - **Purpose**: Uploads the video recording of the finished class for students to view later.
    - **Role Restriction**: `instructor`

### 7. Reviews (Inbox)
- **What it does**: A central inbox where the instructor can see all reviews left by students on their courses, and reply to them.
- **User Interaction**: Instructor views a list of reviews and types a reply in the text area below a review to submit it.
- **Backend API Endpoints**:
  - `GET /instructor/reviews`
    - **Purpose**: Fetches all reviews across the instructor's courses.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/reviews/{reviewId}/reply`
    - **Purpose**: Adds an instructor reply to a student's review.
    - **Role Restriction**: `instructor`

### 8. Profile & Payout
- **What it does**: Profile management and bank/payout details configuration.
- **User Interaction**: Instructor updates their bio, avatar, and enters payout info (e.g. PayPal/Bank details) so the Accounts team can process payouts.
- **Backend API Endpoints**:
  - `GET /instructor/profile`
    - **Purpose**: Retrieves the instructor's profile and payout info.
    - **Role Restriction**: `instructor`
  - `PUT /instructor/profile`
    - **Purpose**: Updates the profile and payout info.
    - **Role Restriction**: `instructor`

### 9. Support
- **What it does**: Ticketing interface for the instructor. The raise-ticket form uses a two-level category → sub-category selection (loaded from `GET /api/v1/support-tickets/routing-options`), and the ticket is routed to the matching department with an `SRnnn` number.
- **Backend API Endpoints**: shared `/api/v1/support-tickets/...` endpoints. See [SUPPORT_AND_DEPARTMENTS.md](./SUPPORT_AND_DEPARTMENTS.md).
