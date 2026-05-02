# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Work-Smarter is a fullstack task and resume management application with AI-powered analysis. It uses a Django REST Framework backend, Next.js frontend, and PostgreSQL database — all orchestrated via Docker Compose. All project development objectives can be found in ROADMAP.md. This should be the starting point for every Claude session.

## Development Commands

### Running the full stack

```bash
docker-compose up                          # Start all services
docker-compose up --build                  # Rebuild and start
docker-compose down                        # Stop all services
```

### Backend (Django)

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py shell
```

### Frontend (Next.js)

```bash
cd frontend && npm run dev                 # Dev server (port 3000)
cd frontend && npm run build              # Production build
cd frontend && npm run lint               # ESLint
```

### Testing

```bash
# Run all backend tests
docker-compose exec backend pytest

# Run with coverage
docker-compose exec backend pytest --cov=backend

# Run a single test file
docker-compose exec backend pytest test/test_tasks.py

# Run a single test
docker-compose exec backend pytest test/test_tasks.py::TestClassName::test_method_name

# Check for missing migrations
docker-compose exec backend python manage.py makemigrations --check --dry-run
```

### Database

```bash
docker-compose exec db psql -U postgres    # PostgreSQL shell
docker-compose exec backend python manage.py dbshell
```

## Architecture

### Backend (`/backend`)

Django 4.2 + DRF 3.15. Entry point: `backend/settings.py` (project config), `api/` (main app).

- `backend/settings.py` — JWT auth (60-min access tokens), cursor pagination (50/page), CORS for `localhost:3000`
- `backend/urls.py` — Root router; mounts `api/urls.py` plus dj-rest-auth endpoints
- `api/models.py` — All core models: `Task`, `Project`, `Resume`, `RecurringTask`, `RecurringTaskException`
- `api/views.py` + `api/views/` — DRF viewsets; upload/download views in subdirectories
- `api/serializers.py` — DRF serializers for all models
- `api/services/` — Business logic: `recurring_tasks.py`, `skippable_tasks.py`, `resume_analysis.py` (Anthropic-powered resume scoring)
- `backend/signals.py` — Django signals (post-save hooks)
- `backend/adapters.py` — django-allauth adapters for custom auth behavior
- `test/` — pytest suite; `conftest.py` has shared fixtures

**Authentication flow**: django-allauth handles registration/social auth → dj-rest-auth exposes REST endpoints → SimpleJWT issues access/refresh tokens. Custom login endpoint at `POST /api/auth/login/` uses email (not username). Token refresh at `POST /api/auth/refresh/` with `{"refresh": "<token>"}` body.

**Task model key fields**: self-referencing FK for subtasks, optional FK to `Project`, priority (urgent/high/medium/low), category (task/meeting/note), `begin_date`/`end_date`, `is_done`. Unique constraint on `(user, title, begin_date, project, parent)`.

### Frontend (`/frontend`)

Next.js 15 + React 18 + TypeScript. Pages-router (not App Router).

- `pages/` — Route pages; `tasks/`, `projects/`, `resume/` are main feature areas
- `components/` — Organized by feature domain (notes, tasks, etc.)
- `context/` — React Context for global state: `AuthContext`, `TasksContext`, `ProjectsContext`, `SystemsContext`, `APIContext`, `ResumesContext`
- `hooks/` — Custom hooks: `useDailyLog`, `useProjectInsights`
- `lib/` — Shared utility functions
- `types/` — TypeScript type definitions

API calls use `fetch` (not axios) — `APIContext` provides `getAuthHeaders()` and form upload helpers. Auth state lives in `AuthContext.tsx`.

### Data Flow

```
Browser → Next.js (port 3000) → Django API (port 8000) → PostgreSQL (port 5432)
```

The backend runs behind gunicorn in production (`backend.wsgi:application`). In Docker dev, the backend volume mounts `./backend:/app` for live reload.

### Environment Variables

- Backend: `./backend/.env` — must include `DATABASE_URL`, `SECRET_KEY`, `DEBUG`, `GROQ_API_KEY` (for AI resume analysis/generation), AWS credentials
- Media files: uploaded resumes are stored at `./backend/media/resumes/` (persisted via Docker volume mount `./backend:/app`)
- Frontend: `./frontend/.env.local` — API base URL

### CI/CD

GitHub Actions (`.github/workflows/ci.yaml`) runs on PRs and pushes to `main`/`dev`. The `backend-tests` job builds the Docker image, spins up a Postgres container, runs pytest, and checks for missing migrations. Frontend checks are currently commented out.
