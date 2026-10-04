# API Reference

> All endpoints verified from source files in `backend/app/routers/`. Role names are the literal strings passed to `require_role()`.
>
> **Route prefixes** (registered in `main.py`):
> - `/api/v1/accounts/...` — accounts.py
> - `/api/v1/admin/...` — admin.py
> - `/api/v1/coordinator/...` — coordinator.py
> - `/api/v1/instructor/...` — instructor.py
> - `/api/v1/learner/...` — learner.py
> - `/api/v1/public/...` — public.py
> - `/api/v1/subadmin/...` — subadmin.py
> - `/api/v1/superadmin/...` — superadmin.py
> - `/support-tickets/...` — support.py
> - `/api/v1/transcripts/...` — transcripts.py

**Total endpoints: 152** across 10 router files.

---

## Cross-Reference Notes

### ⚠️ Orphaned / Unused Backend Endpoints (backend endpoint exists, no frontend caller found)
| Endpoint | Router | Notes |
|----------|--------|-------|
| `POST /payouts/batches/run` | accounts.py | No frontend call found |
| `GET /payouts/batches` | accounts.py | No frontend call found |
| `PUT /payouts/batches/{id}/release` | accounts.py | No frontend call found |
| `GET /admin/metrics` | admin.py | Separate from superadmin — no frontend call found |
| `PUT /admin/courses/{id}/moderate` | admin.py | No frontend call found |
| `POST /learner/refund-request` | learner.py | Duplicate — frontend uses `/transactions/{id}/request-refund` |
| `GET /learner/lessons/{id}/video` | learner.py | Role = None; called internally by player |
| `GET /instructor/students` | instructor.py | Lists all students across all courses |

### ⚠️ Frontend Calls with No Matching Backend Endpoint (needs verification)
| Frontend Call | File | Status |
|--------------|------|--------|
| `GET /coordinator/stats` | CoordinatorDashboard.jsx | Maps to `GET /stats` in coordinator.py — OK if prefix is `/coordinator` |
| `GET /superadmin/settings` | SASettings.jsx | Not found in `superadmin.py` — **possibly missing endpoint** |
| `PUT /superadmin/settings` | SASettings.jsx | Not found in `superadmin.py` — **possibly missing endpoint** |

---

## accounts.py — Role: `accounts`

Full prefix: `/api/v1/accounts`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/accounts/dashboard/kpis` | `get_dashboard_kpis` | Dashboard KPIs |
| GET | `/api/v1/accounts/transactions` | `list_transactions` | Paginated transaction ledger |
| GET | `/api/v1/accounts/refunds` | `list_refund_requests` | Pending refund queue |
| PUT | `/api/v1/accounts/refunds/{refund_id}/approve` | `approve_refund` | Sets enrollment → `refunded` |
| PUT | `/api/v1/accounts/refunds/{refund_id}/reject` | `reject_refund` | Enrollment unchanged |
| GET | `/api/v1/accounts/payouts` | `list_instructor_payouts` | Estimated earnings (20% fee) |
| POST | `/api/v1/accounts/payouts/{instructor_id}/mark-paid` | `mark_instructor_paid` | Creates payout snapshot row |
| POST | `/api/v1/accounts/payouts/batches/run` | `run_payout_batches` | ⚠️ No frontend caller |
| GET | `/api/v1/accounts/payouts/batches` | `list_payout_batches` | ⚠️ No frontend caller |
| PUT | `/api/v1/accounts/payouts/batches/{payout_id}/release` | `release_payout_batch` | ⚠️ No frontend caller |
| GET | `/api/v1/accounts/invoices` | `list_invoices` | Paginated invoice archive |
| GET | `/api/v1/accounts/support-tickets` | `accounts_get_support_tickets` | Admin ticket view |
| PUT | `/api/v1/accounts/support-tickets/{ticket_id}` | `accounts_update_support_ticket` | Update ticket status |
| POST | `/api/v1/accounts/support-tickets/{ticket_id}/reply` | `accounts_reply_support_ticket` | Admin reply |
| GET | `/api/v1/accounts/financial-reports` | `get_financial_reports` | Aggregated financial reports |
| GET | `/api/v1/accounts/course-earnings` | `get_course_earnings` | Revenue per course |
| GET | `/api/v1/accounts/enrollments` | `list_enrollments` | Pending enrollment queue |
| PUT | `/api/v1/accounts/enrollments/{enrollment_id}/approve` | `accounts_approve_enrollment` | Grants learner access |
| PUT | `/api/v1/accounts/enrollments/{enrollment_id}/reject` | `accounts_reject_enrollment` | Denies learner access |

---

## admin.py — Role: `admin`

Full prefix: `/api/v1/admin`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/admin/metrics` | `get_metrics` | ⚠️ No frontend caller found |
| GET | `/api/v1/admin/users` | `list_users` | All users |
| PUT | `/api/v1/admin/users/{user_id}/deactivate` | `deactivate_user` | Soft-suspend |
| PUT | `/api/v1/admin/users/{user_id}/activate` | `activate_user` | Re-activate |
| GET | `/api/v1/admin/courses` | `list_all_courses` | All courses |
| PUT | `/api/v1/admin/courses/{course_id}/moderate` | `moderate_course` | ⚠️ No frontend caller found |
| GET | `/api/v1/admin/reviews` | `list_all_reviews` | All reviews |
| PUT | `/api/v1/admin/reviews/{review_id}/moderate` | `moderate_review` | Moderation action |
| GET | `/api/v1/admin/enrollments` | `list_enrollments` | All enrollments |
| PUT | `/api/v1/admin/enrollments/{enrollment_id}/approve` | `approve_enrollment` | Grant access |
| PUT | `/api/v1/admin/enrollments/{enrollment_id}/reject` | `reject_enrollment` | Deny access |
| GET | `/api/v1/admin/audit-logs` | `list_audit_logs` | Security audit trail |

---

## coordinator.py — Role: `coursecoordinator`

Full prefix: `/api/v1/coordinator`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/coordinator/instructors` | `list_instructors` | Instructor roster |
| GET | `/api/v1/coordinator/courses/pending` | `list_pending_courses` | Approval queue |
| GET | `/api/v1/coordinator/courses` | `list_all_courses` | All courses |
| PUT | `/api/v1/coordinator/courses/{course_id}/approve` | `approve_course` | Sets status → `published` |
| PUT | `/api/v1/coordinator/courses/{course_id}/reject` | `reject_course` | Sets status → `draft` + rejection reason |
| GET | `/api/v1/coordinator/courses/{course_id}/preview` | `preview_course` | Full curriculum preview |
| GET | `/api/v1/coordinator/stats` | `get_coordinator_stats` | Dashboard metrics |
| GET | `/api/v1/coordinator/categories` | `list_categories` | Category list |
| POST | `/api/v1/coordinator/categories` | `create_category` | Add category |
| PUT | `/api/v1/coordinator/categories/{category_id}` | `update_category` | Edit category |
| DELETE | `/api/v1/coordinator/categories/{category_id}` | `delete_category` | Remove category |
| GET | `/api/v1/coordinator/reviews` | `list_all_reviews` | All reviews |
| PUT | `/api/v1/coordinator/reviews/{review_id}/moderate` | `moderate_review` | Moderate review |
| GET | `/api/v1/coordinator/reports` | `get_reports` | Platform reports |

---

## instructor.py — Role: `instructor`

Full prefix: `/api/v1/instructor`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/instructor/courses` | `list_own_courses` | Own courses only |
| POST | `/api/v1/instructor/courses` | `create_course` | Creates with `status=draft` |
| GET | `/api/v1/instructor/courses/{course_id}` | `get_course_detail` | Own course detail |
| PUT | `/api/v1/instructor/courses/{course_id}` | `update_course` | Update metadata |
| POST | `/api/v1/instructor/courses/{course_id}/upload-thumbnail` | `upload_course_thumbnail` | Upload image |
| DELETE | `/api/v1/instructor/courses/{course_id}` | `delete_course` | Draft only (published cannot be deleted) |
| PUT | `/api/v1/instructor/courses/{course_id}/publish` | `toggle_publish` | draft→pending_review or published→draft |
| POST | `/api/v1/instructor/courses/{course_id}/sections` | `create_section` | Add section |
| PUT | `/api/v1/instructor/sections/{section_id}` | `update_section` | Edit section |
| DELETE | `/api/v1/instructor/sections/{section_id}` | `delete_section` | Remove section |
| POST | `/api/v1/instructor/sections/{section_id}/lessons` | `create_lesson` | Add lesson |
| PUT | `/api/v1/instructor/lessons/{lesson_id}` | `update_lesson` | Update lesson |
| DELETE | `/api/v1/instructor/lessons/{lesson_id}` | `delete_lesson` | Remove lesson |
| PUT | `/api/v1/instructor/lessons/{lesson_id}/toggle-preview` | `toggle_lesson_preview` | Free preview on/off |
| POST | `/api/v1/instructor/lessons/{lesson_id}/upload-video` | `upload_lesson_video` | Triggers background transcode + transcription |
| POST | `/api/v1/instructor/lessons/{lesson_id}/upload-thumbnail` | `upload_lesson_thumbnail` | Lesson thumbnail |
| GET | `/api/v1/instructor/reviews` | `list_instructor_reviews` | All reviews on own courses |
| PUT | `/api/v1/instructor/reviews/{review_id}/reply` | `reply_to_review` | Reply to a student review |
| GET | `/api/v1/instructor/earnings` | `get_instructor_earnings` | Earnings data |
| GET | `/api/v1/instructor/payouts` | `get_instructor_payouts` | Payout history |
| GET | `/api/v1/instructor/students` | `list_all_students` | ⚠️ All students across all courses |
| GET | `/api/v1/instructor/courses/{course_id}/students` | `list_course_students` | Students per course |
| POST | `/api/v1/instructor/courses/{course_id}/live-classes` | `schedule_live_class` | Schedule session |
| GET | `/api/v1/instructor/live-classes` | `list_instructor_live_classes` | All scheduled sessions |
| PUT | `/api/v1/instructor/live-classes/{live_class_id}/start` | `start_live_class` | Mark started |
| PUT | `/api/v1/instructor/live-classes/{live_class_id}/end` | `end_live_class` | Mark ended |
| DELETE | `/api/v1/instructor/live-classes/{live_class_id}` | `delete_live_class` | Cancel session |
| POST | `/api/v1/instructor/lessons/{lesson_id}/quiz-questions` | `add_quiz_question` | Add quiz Q |
| GET | `/api/v1/instructor/lessons/{lesson_id}/quiz-questions` | `list_quiz_questions` | List quiz Qs |
| DELETE | `/api/v1/instructor/quiz-questions/{question_id}` | `delete_quiz_question` | Remove quiz Q |
| PUT | `/api/v1/instructor/quiz-questions/{question_id}` | `update_quiz_question` | Edit quiz Q |
| POST | `/api/v1/instructor/lessons/{lesson_id}/assignments` | `add_assignment` | Add assignment |
| GET | `/api/v1/instructor/lessons/{lesson_id}/assignments` | `list_assignments` | List assignments |
| DELETE | `/api/v1/instructor/assignments/{assignment_id}` | `delete_assignment` | Remove assignment |
| PUT | `/api/v1/instructor/assignments/{assignment_id}` | `update_assignment` | Edit assignment |
| GET | `/api/v1/instructor/profile` | `get_instructor_profile` | Profile + payout info |
| PUT | `/api/v1/instructor/profile` | `update_instructor_profile` | Update profile + payout info |
| PUT | `/api/v1/instructor/enrollments/{enrollment_id}/approve` | `approve_enrollment` | Manual enrollment approval |
| PUT | `/api/v1/instructor/enrollments/{enrollment_id}/reject` | `reject_enrollment` | Manual enrollment rejection |

---

## learner.py — Role: `learner`

Full prefix: `/api/v1/learner`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/learner/profile` | `get_profile` | Learner profile |
| PUT | `/api/v1/learner/profile` | `update_profile` | Update profile |
| POST | `/api/v1/learner/wishlist/{course_id}` | `add_to_wishlist` | Save for later |
| DELETE | `/api/v1/learner/wishlist/{course_id}` | `remove_from_wishlist` | Remove from wishlist |
| GET | `/api/v1/learner/wishlist` | `get_wishlist` | View wishlist |
| POST | `/api/v1/learner/enroll/{course_id}` | `enroll_in_course` | Creates pending enrollment + mock transaction |
| GET | `/api/v1/learner/transactions` | `list_transactions` | Purchase history |
| GET | `/api/v1/learner/courses` | `list_enrolled_courses` | My enrolled courses |
| GET | `/api/v1/learner/courses/{course_id}` | `get_learner_course_detail` | ⚠️ Role=None in extractor |
| GET | `/api/v1/learner/courses/{course_id}/progress` | `get_course_progress` | Completed lesson IDs |
| PUT | `/api/v1/learner/progress` | `update_progress` | Mark lesson completed |
| POST | `/api/v1/learner/reviews` | `submit_review` | Submit course review |
| POST | `/api/v1/learner/refund-request` | `request_refund` | ⚠️ Duplicate — see below |
| GET | `/api/v1/learner/lessons/{lesson_id}/video` | `get_lesson_video` | Video stream (access-gated) |
| GET | `/api/v1/learner/transactions/{transaction_id}/invoice` | `get_invoice` | Invoice PDF data |
| POST | `/api/v1/learner/transactions/{transaction_id}/request-refund` | `request_refund` | Creates RefundRequest |
| GET | `/api/v1/learner/courses/{course_id}/live-classes` | `list_course_live_classes` | Session schedule |
| GET | `/api/v1/learner/courses/{course_id}/detail` | `get_enrolled_course_detail` | Full course + section structure |
| GET | `/api/v1/learner/my-reviews` | `get_my_reviews` | My submitted reviews |
| GET | `/api/v1/learner/progress-overview` | `get_progress_overview` | Aggregate stats |

---

## public.py — Role: None (unauthenticated)

Full prefix: `/api/v1/public`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/public/courses` | `list_courses` | Published courses catalog |
| GET | `/api/v1/public/courses/{course_id}` | `get_course_detail` | Course sales page data |
| GET | `/api/v1/public/lessons/{lesson_id}/preview` | `get_lesson_preview` | Preview-flagged lesson only |
| GET | `/api/v1/public/categories` | `list_categories` | All categories |
| GET | `/api/v1/public/categories-with-count` | `list_categories_with_count` | Categories + published count |
| GET | `/api/v1/public/lessons/{lesson_id}/preview/video` | `get_lesson_preview_video` | Video stream for previews |
| GET | `/api/v1/public/live-classes/{live_class_id}/join-info` | `get_live_class_join_info` | Public join link |

---

## subadmin.py — Role: `sub_admin`

Full prefix: `/api/v1/subadmin`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/subadmin/users` | `list_users` | All users |
| PUT | `/api/v1/subadmin/users/{user_id}/role` | `change_user_role` | Role change |
| PUT | `/api/v1/subadmin/users/{user_id}/deactivate` | `deactivate_user` | Suspend account |
| PUT | `/api/v1/subadmin/users/{user_id}/reactivate` | `reactivate_user` | Restore account |
| GET | `/api/v1/subadmin/courses` | `list_all_courses` | All courses |
| PUT | `/api/v1/subadmin/courses/{course_id}/status` | `override_course_status` | Force status change |
| GET | `/api/v1/subadmin/categories` | `list_categories` | Category list |
| POST | `/api/v1/subadmin/categories` | `create_category` | Add category |
| PUT | `/api/v1/subadmin/categories/{category_id}` | `update_category` | Edit category |
| DELETE | `/api/v1/subadmin/categories/{category_id}` | `delete_category` | Remove category |
| GET | `/api/v1/subadmin/approvals/pending` | `list_pending_approvals` | Pending course queue |
| PUT | `/api/v1/subadmin/approvals/{course_id}/approve` | `approve_course` | Publish course |
| PUT | `/api/v1/subadmin/approvals/{course_id}/reject` | `reject_course` | Reject with reason |
| GET | `/api/v1/subadmin/reviews` | `list_all_reviews` | All reviews |
| PUT | `/api/v1/subadmin/reviews/{review_id}/moderate` | `moderate_review` | Moderate action |
| GET | `/api/v1/subadmin/analytics/kpis` | `get_kpis` | Platform KPIs |
| GET | `/api/v1/subadmin/support-tickets` | `list_support_tickets` | Subadmin support inbox |
| GET | `/api/v1/subadmin/support-tickets/unread-count` | `get_unread_count` | Unread badge polling |
| PUT | `/api/v1/subadmin/support-tickets/{ticket_id}` | `update_ticket_status` | Status change |
| POST | `/api/v1/subadmin/support-tickets/{ticket_id}/reply` | `reply_support_ticket` | Subadmin reply |
| POST | `/api/v1/subadmin/support-tickets/{ticket_id}/read` | `mark_ticket_read` | Clear unread status |

---

## superadmin.py — Role: `admin`

Full prefix: `/api/v1/superadmin`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/superadmin/users` | `list_users` | All users |
| PUT | `/api/v1/superadmin/users/{user_id}/role` | `change_user_role` | Role change |
| PUT | `/api/v1/superadmin/users/{user_id}/deactivate` | `deactivate_user` | Suspend |
| PUT | `/api/v1/superadmin/users/{user_id}/reactivate` | `reactivate_user` | Restore |
| GET | `/api/v1/superadmin/courses` | `list_all_courses` | All courses |
| PUT | `/api/v1/superadmin/courses/{course_id}/status` | `override_course_status` | Force status |
| GET | `/api/v1/superadmin/categories` | `list_categories` | Categories |
| POST | `/api/v1/superadmin/categories` | `create_category` | Add category |
| PUT | `/api/v1/superadmin/categories/{category_id}` | `update_category` | Edit category |
| DELETE | `/api/v1/superadmin/categories/{category_id}` | `delete_category` | Remove category |
| GET | `/api/v1/superadmin/approvals/pending` | `list_pending_approvals` | Approval queue |
| PUT | `/api/v1/superadmin/approvals/{course_id}/approve` | `approve_course` | Publish |
| PUT | `/api/v1/superadmin/approvals/{course_id}/reject` | `reject_course` | Reject with reason |
| GET | `/api/v1/superadmin/finance/overview` | `finance_overview` | Revenue summary |
| GET | `/api/v1/superadmin/finance/transactions` | `recent_transactions` | Transaction ledger |
| GET | `/api/v1/superadmin/analytics/kpis` | `get_kpis` | Platform KPIs |
| GET | `/api/v1/superadmin/reviews` | `list_all_reviews` | All reviews |
| PUT | `/api/v1/superadmin/reviews/{review_id}/moderate` | `moderate_review` | Moderate |
| GET | `/api/v1/superadmin/audit-logs` | `list_audit_logs` | Security audit trail |
| GET | `/api/v1/superadmin/support-tickets` | `list_support_tickets` | Superadmin support inbox |
| GET | `/api/v1/superadmin/support-tickets/unread-count` | `get_unread_count` | Unread badge polling |
| PUT | `/api/v1/superadmin/support-tickets/{ticket_id}` | `update_ticket_status` | Status change |
| POST | `/api/v1/superadmin/support-tickets/{ticket_id}/reply` | `reply_support_ticket` | Superadmin reply |
| POST | `/api/v1/superadmin/support-tickets/{ticket_id}/read` | `mark_ticket_read` | Clear unread status |

---

## support.py — Role: Any authenticated user (`require_any_role(["learner", "instructor", "coursecoordinator"])`)

Full prefix: `/api/v1/support-tickets`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/support-tickets` | `get_my_tickets` | Own tickets only |
| POST | `/api/v1/support-tickets` | `raise_ticket` | Creates with `status=open` |
| GET | `/api/v1/support-tickets/unread-count` | `get_unread_count` | Unread badge polling |
| GET | `/api/v1/support-tickets/{ticket_id}` | `get_ticket` | Own ticket only (403 otherwise) |
| POST | `/api/v1/support-tickets/{ticket_id}/reply` | `reply_to_ticket` | Re-opens resolved tickets |
| POST | `/api/v1/support-tickets/{ticket_id}/read` | `mark_ticket_read` | Clear unread status |

---

## transcripts.py — Role: Any authenticated user (`get_current_user` + access checks)

Full prefix: `/api/v1/transcripts`

| Method | Full Path | Function | Notes |
|--------|-----------|----------|-------|
| GET | `/api/v1/transcripts/lesson/{lesson_id}` | `get_lesson_transcript` | Requires `ensure_lesson_access()` |
| GET | `/api/v1/transcripts/live-class/{live_class_id}` | `get_live_class_transcript` | Requires `ensure_live_class_access()` |
