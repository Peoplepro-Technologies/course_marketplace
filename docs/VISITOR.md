# Visitor Role Documentation

## Dashboard Overview
The "Visitor" role applies to unauthenticated users who arrive at the platform. They do not have a dedicated dashboard or sidebar. Instead, they interact with public-facing pages such as the Home Page, Category Browser, and Course Details page to explore the catalog before registering.

### Navigation & Features
Visitors typically navigate via a top navigation bar to:
- **Home Page**: Landing page with featured/popular courses.
- **Categories Browser**: Viewing courses grouped by topic.
- **Course Detail Page**: Viewing a specific course's syllabus, reviews, and free preview videos.

---

## Feature-by-Feature Breakdown

### 1. Home Page & Course Discovery
- **What it does**: The main entry point displaying the platform's catalog, often featuring top-rated or newly published courses.
- **User Interaction**: User scrolls through the catalog. Clicking a course card takes them to the Course Detail page.
- **Backend API Endpoints**:
  - `GET /public/courses`
    - **Purpose**: Fetches the public list of published courses.
    - **Role Restriction**: None (Public)

### 2. Categories Browser
- **What it does**: Allows users to filter the catalog by specific topics (e.g., "Programming", "Business").
- **User Interaction**: User clicks on a category pill/link, which refines the course list.
- **Backend API Endpoints**:
  - `GET /public/categories-with-count`
    - **Purpose**: Retrieves all categories along with the number of published courses in each.
    - **Role Restriction**: None (Public)

### 3. Course Detail Page
- **What it does**: The sales page for a specific course. It shows the title, description, instructor bio, course curriculum (sections and lessons), and user reviews.
- **User Interaction**: 
  - User reads the description.
  - If a lesson is marked as "free preview", they can click it to watch a video without purchasing.
  - They can click "Enroll" or "Add to Cart", which will prompt them to log in or register.
- **Backend API Endpoints**:
  - `GET /public/courses/{courseId}`
    - **Purpose**: Fetches full details for a course, including its public curriculum outline.
    - **Role Restriction**: None (Public)
  - `GET /public/lessons/{lessonId}/preview`
    - **Purpose**: Fetches the content (e.g., video URL) of a lesson, provided the lesson is explicitly marked `is_preview = True`.
    - **Role Restriction**: None (Public)

### 4. Live Class Join Info
- **What it does**: (Edge Case) If a live class is marked as public or open, visitors might be able to query its schedule or join link.
- **Backend API Endpoints**:
  - `GET /public/live-classes/{liveClassId}/join-info`
    - **Purpose**: Retrieves public join details for a webinar/live session.
    - **Role Restriction**: None (Public)
