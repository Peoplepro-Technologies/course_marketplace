# Course Marketplace Platform — Technical Documentation

> **Purpose**: End-of-internship technical documentation covering the full platform: every role's dashboard, every feature, backend API endpoints, and key workflow flowcharts.
>
> **Method**: All content in this documentation was derived directly from the source code — router files, frontend component files, and service utilities. Anything that could not be confirmed from the code is explicitly marked **"Needs Verification"** or **"⚠️"**.
>
> **Date**: October 2026 (updated for departments, staff portal, faculty management and branding cleanup)  
> **Stack**: FastAPI (Python) · React (JSX) · PostgreSQL · Keycloak (Auth) · FFmpeg + faster-whisper (Media)

---

## Table of Contents

### Platform Overview

- [Architecture Summary](#architecture-summary)
- [Roles on the Platform](#roles-on-the-platform)
- [Course Status Lifecycle](#course-status-lifecycle)
- [Enrollment Status Lifecycle](#enrollment-status-lifecycle)

### Role Documentation

1. [Learner](./LEARNER.md)
2. [Instructor](./INSTRUCTOR.md)
3. [Course Coordinator](./COORDINATOR.md)
4. [Accounts](./ACCOUNTS.md)
5. [Sub Admin](./SUB_ADMIN.md)
6. [Super Admin](./SUPER_ADMIN.md)
7. [Visitor (Unauthenticated)](./VISITOR.md)
8. [Support Tickets, Departments & Staff Portal](./SUPPORT_AND_DEPARTMENTS.md) — department-driven routing, `staff` role, Super Admin tooling
9. [Department Roles](./DEPARTMENT_ROLES.md) — HR, IT/Technical Support, Academic Team, Academic Operations, Student Support, MIS/Reporting, Accounts/Finance, Course Coordinator, Admin: tickets each one receives

### Operations

- [Setup & Operations](./SETUP_AND_OPERATIONS.md) — services, env vars, migrations, seed scripts, frontend conventions

### API Reference

- [Full API Reference](./API_REFERENCE.md) — 198 endpoints across 10 routers, with route prefixes, role restrictions, and cross-reference notes (orphaned endpoints, missing callers)

### Workflow Flowcharts

- [All 8 Flowcharts](./FLOWCHARTS.md)
  1. Course Creation → Coordinator Approval → Publish
  2. Enrollment → Accounts Approval → Access Granted
  3. Video Upload → Background Transcoding → Lesson Ready
  4. Refund Request → Accounts Approval → Access Revoked
  5. Instructor Payout Flow
  6. Support Ticket Lifecycle (department routing)
  7. Transcript System (Automatic FFmpeg/Whisper vs Manual YouTube Paste)
  8. Instructor Reassignment (Coordinator)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  /src/pages/                                                     │
│  ├── learner/        ← Learner dashboard & lesson viewer         │
│  ├── instructor/     ← Course builder, live classes, earnings    │
│  ├── coordinator/    ← Approvals, faculty mgmt, categories, stats│
│  ├── accounts/       ← Financial ops, refunds, payouts           │
│  ├── subadmin/       ← User mgmt, course override, moderation    │
│  ├── superadmin/     ← Users, departments, ticket routing, audit │
│  ├── admin/          ← Legacy admin pages (router not registered)│
│  └── shared/         ← Support tickets + staff/department portal │
│                                                                  │
│  Auth: Keycloak (JWT) — /src/auth/keycloak.js                   │
│  API calls: axios wrapper at /src/api/api.js                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (axios → FastAPI)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI · Python)                    │
│  /app/routers/        ← 10 router files (198 endpoints)         │
│  /app/models/         ← SQLAlchemy ORM models                   │
│  /app/services/       ← transcription.py (Whisper), etc.        │
│  /app/utils/ffmpeg.py ← FFmpeg binary discovery + audio extract │
│  /app/auth/           ← Keycloak JWT validation + require_role  │
│                                                                  │
│  Background Tasks: FastAPI BackgroundTasks (video transcode)     │
│  Cache: Redis (course catalog invalidation)                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                          │
│  Key tables: users, courses, sections, lessons, enrollments,    │
│  transactions, refund_requests, instructor_payouts,             │
│  live_classes, transcripts, support_tickets, ticket_replies,    │
│  ticket_reads, departments, ticket_routing_rules, quizzes,      │
│  assignments (+submissions, quiz_attempts), wishlist, audit_logs│
│  reviews, progress, platform_settings                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Roles on the Platform

| Role Token          | Display Name       | Keycloak Role String | Description                            |
| ------------------- | ------------------ | -------------------- | -------------------------------------- |
| `learner`           | Learner            | `learner`            | Takes courses, manages purchases       |
| `instructor`        | Instructor         | `instructor`         | Creates and manages courses            |
| `coursecoordinator` | Course Coordinator | `coursecoordinator`  | Reviews and approves courses           |
| `accounts`          | Accounts           | `accounts`           | Financial operations, payouts, refunds |
| `sub_admin`         | Sub Admin          | `sub_admin`          | Delegated platform management          |
| `admin`             | Super Admin        | `admin`              | Full platform control + audit          |
| `staff`             | Department Staff   | `staff`              | Works the ticket queue of their assigned department |
| _(none)_            | Visitor            | —                    | Unauthenticated public access          |

> **Note**: the `super_admin` realm role is stored locally as `admin`. Role priority when a token has several: super_admin/admin > sub_admin > coursecoordinator > accounts > instructor > staff > learner. A staff user's department comes from `users.department_id` (see [SUPPORT_AND_DEPARTMENTS.md](./SUPPORT_AND_DEPARTMENTS.md)).

> **Note**: The `superadmin.py` router uses `require_role("admin")` — the role token is `admin`, not `super_admin`. This is a common source of confusion.

---

## Course Status Lifecycle

```
draft ──[Instructor clicks Publish]──► pending_review
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                         Coordinator     Sub Admin       Super Admin
                         approves        approves        approves
                              │               │               │
                              └───────────────┼───────────────┘
                                              ▼
                                          published ──[Instructor un-publishes]──► draft
                                              │
                                    [Admin force-status]
                                              ▼
                                    removed / flagged / draft
```

**All valid statuses**: `draft`, `pending_review`, `published`, `removed`, `flagged`, `rejected`

- `draft` → `pending_review` via `PUT /instructor/courses/{id}/publish`
- `pending_review` → `published` via coordinator/sub_admin/super_admin approve
- `pending_review` or `published` → `draft` via instructor un-publish toggle
- Any status → `published`/`draft`/`removed`/`flagged` via admin force-override

---

## Enrollment Status Lifecycle

```
[Learner enrolls] ──► pending ──[Accounts approves]──► approved ──[Learner has course access]
                          │                                │
                  [Accounts rejects]           [Refund approved]
                          │                                │
                       rejected                        refunded ──[Access revoked]
```

**All valid statuses**: `pending`, `approved`, `rejected`, `refunded`

- Access to lesson content is gated by `enrollment.status == "approved"`
- Refund approval sets `enrollment.status = "refunded"`, immediately revoking access

---

## Known Gaps & Incomplete Features

| Feature                       | Status        | Details                                                                                                                             |
| ----------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Payment gateway               | ❌ Missing    | `payment_method = "mock"` hardcoded. Issue #55 in codebase.                                                                         |
| Platform Settings             | ❌ Missing endpoints | `SASettings.jsx` calls `GET/PUT /superadmin/settings`, which do not exist in `superadmin.py`.                                |
| Admin router                  | ⚠️ Not registered | `routers/admin.py` (12 endpoints) is not included in `main.py`.                                                              |
| Branch / organization system  | ⚠️ Not in code | Migration `e5d91fecfd6e` adds `branch_id` columns, but no `Branch` model exists in `backend/app/models/`. Department routing is the active mechanism. |
| Legacy ticket routing         | ⚠️ Kept       | `assigned_team`, `assigned_role` and `/superadmin/ticket-routing-rules` still exist; routing now uses `department_id`.            |
| Reconciliation                | 🔜 Planned    | `ACReconciliation.jsx` is a placeholder calling the generic transactions endpoint.                                                  |
| YouTube transcript auto-fetch | ⚠️ IP-blocked | Backend may not be able to reach YouTube API depending on server IP. Manual paste is the documented workaround.                     |
| Payout balance tracking       | ⚠️ Estimated  | `mark-paid` creates a snapshot but does not subtract from a running balance. Reported earnings include all time enrollment revenue. A custom `instructor_payout_rate` is applied if set (default 80/20). |
| Payout batches                | ⚠️ No UI      | `/accounts/payouts/batches*` endpoints exist but no frontend page calls them.                                                       |
