# Learner Role Documentation

## Dashboard Overview
The Learner Dashboard is the central hub for users who are taking courses on the platform. It provides a clean, sidebar-based layout that helps learners navigate their learning journey, manage their purchases, and track their progress.

### Navigation Sidebar
When a learner logs in, they see the following items in their navigation sidebar:
- **My Courses**: Main dashboard view showing all enrolled courses.
- **Wishlist**: Courses saved for future purchase.
- **Purchase History**: Complete log of all transactions and invoice generation.
- **Progress**: Analytics on course completion and lesson tracking.
- **My Reviews**: A central place to manage all reviews given by the learner.
- **Live Classes**: Access to upcoming and past live sessions for enrolled courses.
- **Support**: Ticketing system to get help from platform administrators.

---

## Feature-by-Feature Breakdown

### 1. My Courses (Dashboard)
- **What it does**: Displays a grid of all the courses the user is currently enrolled in.
- **User Interaction**: Users click on "My Courses" in the sidebar, which loads a card grid of courses. Clicking a course card navigates them into the `LessonViewer` for that course.
- **Backend API Endpoints**:
  - `GET /learner/courses` 
    - **Purpose**: Fetches the list of enrolled courses for the current user.
    - **Role Restriction**: `learner`
- **Edge Cases/Limitations**: Courses that are pending approval from Accounts or have been revoked (e.g. after a refund) will not appear here.

### 2. Lesson Viewer & Progress Tracking
- **What it does**: The core learning interface where users watch videos, read transcripts, and mark lessons as complete.
- **User Interaction**: User clicks a lesson on the right-hand outline sidebar. The main area updates with the lesson video (or content) and transcript. Once finished, they click "Mark as Complete".
- **Backend API Endpoints**:
  - `GET /learner/courses/{courseId}/detail`
    - **Purpose**: Fetches the full course structure (sections and lessons) to render the sidebar.
    - **Role Restriction**: `learner`
  - `GET /learner/courses/{courseId}/progress`
    - **Purpose**: Fetches an array of lesson IDs the user has completed.
    - **Role Restriction**: `learner`
  - `GET /transcripts/lesson/{activeLesson.id}`
    - **Purpose**: Loads the transcript (if available) for the current video.
    - **Role Restriction**: None (Public/Authenticated)
  - `PUT /learner/progress`
    - **Purpose**: Submits a payload `{ lesson_id, status: 'completed' }` to record completion.
    - **Role Restriction**: `learner`
- **Edge Cases/Limitations**: YouTube-based videos might have IP blocking issues for transcript generation if the backend is hosted on certain restricted IP ranges. "Needs Verification" if transcripts always load perfectly for YouTube sources.

### 3. Wishlist
- **What it does**: Displays courses the user has liked but not yet purchased.
- **User Interaction**: The user can browse their wishlist cards and click a "Remove" (trash icon) to delete an item from the list.
- **Backend API Endpoints**:
  - `GET /learner/wishlist`
    - **Purpose**: Retrieves all wishlist items for the user.
    - **Role Restriction**: `learner`
  - `DELETE /learner/wishlist/{courseId}`
    - **Purpose**: Removes a specific course from the wishlist.
    - **Role Restriction**: `learner`

### 4. Purchase History & Refunds
- **What it does**: A table of all historical transactions, showing amount, date, and status (e.g. 'completed', 'refund_requested').
- **User Interaction**: 
  - To view an invoice: User clicks "View Invoice", which opens a detailed view of that transaction.
  - To request a refund: User clicks "Request Refund", enters a reason in a modal, and submits.
- **Backend API Endpoints**:
  - `GET /learner/transactions`
    - **Purpose**: Fetches all transactions linked to the learner.
    - **Role Restriction**: `learner`
  - `GET /learner/transactions/{transactionId}/invoice`
    - **Purpose**: Fetches specific data needed to render an invoice (PDF/View).
    - **Role Restriction**: `learner`
  - `POST /learner/transactions/{transactionId}/request-refund`
    - **Purpose**: Flags a transaction as refund requested and requires Accounts approval.
    - **Role Restriction**: `learner`
- **Edge Cases/Limitations**: Refund requests likely have a time-limit window (e.g., 30 days) that needs verification in the backend logic.

### 5. Progress Overview
- **What it does**: A summary dashboard showing aggregate learning stats (e.g., total courses completed, total lessons watched).
- **User Interaction**: User simply views the page; charts and numbers are rendered based on fetched data.
- **Backend API Endpoints**:
  - `GET /learner/progress-overview`
    - **Purpose**: Fetches high-level metrics for the learner.
    - **Role Restriction**: `learner`

### 6. My Reviews
- **What it does**: Lists all the reviews the learner has submitted across various courses.
- **User Interaction**: User can view their past ratings and feedback. To create a new review, they usually do this from the Course Detail page or via the `ReviewForm` component.
- **Backend API Endpoints**:
  - `GET /learner/my-reviews`
    - **Purpose**: Gets all reviews authored by the user.
    - **Role Restriction**: `learner`
  - `POST /learner/reviews`
    - **Purpose**: Submits a new review `{ course_id, rating, comment }`.
    - **Role Restriction**: `learner`

### 7. Live Classes
- **What it does**: Shows a schedule of live Zoom/Meet sessions related to their enrolled courses.
- **User Interaction**: User selects a course from a dropdown to filter, then sees upcoming and past sessions.
- **Backend API Endpoints**:
  - `GET /learner/courses/{course_id}/live-classes`
    - **Purpose**: Fetches scheduled live class records for a specific course.
    - **Role Restriction**: `learner`

### 8. Support
- **What it does**: Ticketing interface for the learner to reach the right team.
- **User Interaction**: The learner picks a **category** (e.g. "Payment & Refund") and then a **sub-category** (e.g. "Refund request"). Both lists come from the routing rules for the `learner` role. The ticket is created as `SRnnn` and sent to the department mapped to that pair. The learner can open a ticket to read staff replies and reply back (replying to a resolved ticket re-opens it).
- **Backend API Endpoints**:
  - `GET /api/v1/support-tickets/routing-options` (and `?category=...`) — dropdown data
  - `GET /api/v1/support-tickets` — my tickets
  - `POST /api/v1/support-tickets` — raise a ticket
  - `GET /api/v1/support-tickets/{ticket_id}` — ticket detail (own tickets only)
  - `POST /api/v1/support-tickets/{ticket_id}/reply`, `POST /api/v1/support-tickets/{ticket_id}/read`, `GET /api/v1/support-tickets/unread-count`
  - **Role Restriction**: raising a ticket requires `learner`, `instructor` or `coursecoordinator`; the others require an authenticated user and only expose the caller's own tickets.
  - See [SUPPORT_AND_DEPARTMENTS.md](./SUPPORT_AND_DEPARTMENTS.md).

### 8b. Assignments & Quizzes
- **What it does**: Inside the lesson viewer, learners submit assignments and answer quiz questions.
- **Backend API Endpoints**:
  - `POST /learner/assignments/{assignmentId}/submit` — submits or re-submits an assignment.
  - `POST /learner/quiz-questions/{questionId}/attempt` — body `{ selected_option_index }`; the attempt and its correctness are stored (`quiz_attempts`).
  - **Role Restriction**: `learner`

### 9. Profile Management
- **What it does**: Allows the learner to update their basic information (name, bio).
- **User Interaction**: The user edits fields in a form and clicks "Save".
- **Backend API Endpoints**:
  - `GET /learner/profile`
    - **Purpose**: Retrieves current profile details.
    - **Role Restriction**: `learner`
  - `PUT /learner/profile`
    - **Purpose**: Updates profile details.
    - **Role Restriction**: `learner`
