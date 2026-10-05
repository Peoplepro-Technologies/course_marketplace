# Setup & Operations

> Based on `package.json`, `backend/requirements.txt`, `backend/.env.example`, `backend/alembic/`, and the helper scripts in `backend/`.

## 1. Services

| Service | Port | Started by |
|---|---|---|
| Keycloak (auth) | 8080 | `npm run start:keycloak` (`KEYCLOAK_BIN_PATH start-dev`) |
| Backend (FastAPI/uvicorn) | 8000 | `npm run start:backend` (`backend/venv`, FFmpeg on `PATH`) |
| Frontend (Vite) | 5173 | `npm run start:frontend` |
| PostgreSQL | 5432 | external |
| Redis (optional) | 6379 | external; `REDIS_ENABLED=false` by default |

From the repo root `npm run dev` starts Keycloak, backend and frontend together through `concurrently` and `dotenv -e .env`. The `prestart:*` scripts kill stray `java.exe` / `python.exe` processes on Windows first.

CORS only allows `http://localhost:5173` and `http://127.0.0.1:5173` (`main.py`).

## 2. Configuration

`backend/app/config.py` loads `backend/.env` relative to the file, so the backend can be started from any working directory. See `backend/.env.example`:

- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL`, `REDIS_ENABLED`
- `KEYCLOAK_URL`, `KEYCLOAK_REALM` (`course-marketplace`), `KEYCLOAK_CLIENT_ID` (`course-frontend`)
- Keycloak admin credentials for provisioning (`KEYCLOAK_ADMIN_USER` / `KEYCLOAK_ADMIN_PASS`, default `admin`/`admin` in `config.py`) used by `keycloak_admin.py` when a coordinator creates an instructor

## 3. Database

```
cd backend
venv\Scripts\python.exe -m alembic upgrade head
```

Notable migrations: `…add_live_classes_table`, `…add_refund_fields_to_transactions`, `…add_mark_paid_fields_to_instructor_payouts`, `f3a221d5ffa9_add_instructor_management_fields`, `ef4146d2a866_add_can_upload_video`, `ad3021b74d09_add_departments_and_service_request_` (departments, SR tickets, two-level routing).

## 4. Seed & helper scripts (`backend/`)

| Script | Purpose |
|---|---|
| `seed.py`, `seed_more.py`, `seed_interactive.py` | Sample users/courses/data |
| `seed_transactions.py`, `seed_submissions.py` | Sample transactions / assignment submissions |
| `seed_departments_and_routing.py` | Creates the 9 departments and the role → category → sub-category routing rules (idempotent; updates the department if a rule changed) |
| `create_dept_users.py` | Creates the six department test users in Keycloak and assigns their departments |
| `restore_keycloak_users.py`, `migrate_roles.py` | Keycloak user/role maintenance |
| `create_tables.py`, `check_db.py`, `diagnose.py` | DB utilities |

## 5. Roles in Keycloak

Realm roles used: `learner`, `instructor`, `coursecoordinator`, `accounts`, `sub_admin`, `admin`, `super_admin`, `staff`. `get_current_user` picks one local role using the priority super_admin/admin > sub_admin > coursecoordinator > accounts > instructor > staff > learner. `super_admin` is stored locally as `admin`.

## 6. Frontend conventions

- Build: `cd frontend && npm run build` (Vite). Icons come from `lucide-react` for functional nav items.
- Branding: the logo is the plain text wordmark **CourseHub** (bold, `#0056D2`) in `components/Navbar.jsx`; sidebar headers are text-only (role title + muted subtitle) with no emoji or icon.
- Layout rule: if `App.jsx` wraps a route in a role `…SidebarLayout`, the page component must not wrap itself again.
- `cloudflared.exe`, `keycloak-26.7.0/` and `backend/course_marketplace.db` are local tooling files in the working tree, not part of the application code.
