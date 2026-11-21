# Clearflow: Document Approval Workflow

A small document approval application for the Springboard take-home challenge. Submitters can send a text document and track its status. Reviewers can see submitted documents and approve or reject pending ones. The backend enforces ownership and reviewer permissions; the frontend provides distinct views for each role.

## Stack and scope

- Backend: Django, Django REST Framework, SQLite for local development.
- Frontend: React, TypeScript, Vite.
- Authentication: Django sessions and CSRF protection.
- Document format: title plus text input. The challenge permits a file **or** an input; text keeps this iteration small and testable.
- No public signup. Local demo accounts are created by a management command.

## Project structure

- `frontend/src/App.tsx` handles the current session and chooses the login or dashboard view.
- `frontend/src/Dashboard.tsx` coordinates submissions, filters, and decisions.
- `frontend/src/components/` holds the login, submission form, list, detail, and status badge UI.
- `frontend/src/api.ts` is the single place for HTTP requests and API types.
- `backend/submissions/` contains the model, serializers, permissions in views, API routes, and tests.

## Run locally

Prerequisites: Python 3.11+ and Node.js 20.19+ or 22.12+.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python backend/manage.py migrate
DEMO_SUBMITTER_PASSWORD='choose-a-local-password' \
DEMO_REVIEWER_PASSWORD='choose-another-local-password' \
  .venv/bin/python backend/manage.py create_demo_users
```

Start the backend in one terminal:

```bash
.venv/bin/python backend/manage.py runserver 127.0.0.1:8000
```

Start the frontend in another:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Sign in as `submitter` or `reviewer` with the passwords you set above. The Vite development server proxies `/api` to Django. Run both servers using the same hostname style shown here so the session and CSRF cookies work as expected.

## Tests

After installing dependencies, run all checks with one command:

```bash
bash scripts/test.sh
```

The backend tests cover login CSRF, bad credentials, create and validation, ownership, reviewer permissions, approve/reject, terminal-state conflict, and anonymous access. The frontend tests exercise submission, approval, validation errors, decision conflicts, and retrying a failed session check. The script also checks the production frontend build.

## API design

All endpoints are under `/api`. The frontend first calls `GET /api/csrf`, then includes the returned token in the `X-CSRFToken` header for write requests. The browser sends its session cookie on same-origin requests.

| Method | Endpoint | Role | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/csrf` | Anyone | — | `{ "csrfToken": "..." }` |
| POST | `/session` | Anyone | `{ "username": "...", "password": "..." }` | `{ "username": "...", "role": "submitter" }` or reviewer |
| DELETE | `/session` | Signed in | — | 204 |
| GET | `/me` | Signed in | — | Current username and role |
| POST | `/submissions` | Submitter | `{ "title": "...", "content": "..." }` | Created submission, 201 |
| GET | `/submissions` | Signed in | Optional `?status=pending\|approved\|rejected` | Array of visible submissions, newest first |
| GET | `/submissions/{id}` | Owner or reviewer | — | Submission |
| POST | `/submissions/{id}/decision` | Reviewer | `{ "decision": "approved" }` or `rejected` | Updated submission |

Submission response example:

```json
{
  "id": "f064e6ae-60ee-4981-b7f8-845c6ce064de",
  "submitter": "submitter",
  "title": "Project proposal",
  "content": "Please review this proposal.",
  "status": "pending",
  "created_at": "2026-11-20T10:00:00Z",
  "decided_by": null,
  "decided_at": null
}
```

Validation errors return 400 with `code`, `message`, and `field_errors`. Missing sessions return 401; insufficient permissions return 403; inaccessible or missing submissions return 404; a second decision returns 409. For example:

```json
{
  "code": "validation_error",
  "message": "Please correct the highlighted fields.",
  "field_errors": { "title": ["This field may not be blank."] }
}
```

## Data model and state transitions

`Submission` has a UUID identifier, submitter, title (max 200 characters), content (max 10,000 characters), status, creation time, and nullable decision actor/time. A new submission is `pending`. A reviewer may move it once to `approved` or `rejected`; both are terminal. The decision endpoint uses a conditional database update on `status=pending`, so two reviewers cannot both successfully decide the same record. A losing request gets 409 and can refresh the queue.

Submitters only query their own records, including on direct detail lookup. Reviewers can view all records and filter by status. The backend makes these decisions; the UI role is only a presentation choice.

## Security, reliability, and growth

- Django password hashing, HTTP-only session cookies, SameSite cookies, CSRF tokens, server-side permissions, and validation protect the core workflow. Secure cookies are enabled when `DJANGO_DEBUG=0`. Configure `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, and `DJANGO_CSRF_TRUSTED_ORIGINS` before deployment.
- In production mode Django redirects to HTTPS and sends HSTS. If TLS terminates at a reverse proxy, set `DJANGO_TRUST_X_FORWARDED_PROTO=1` only when that proxy controls the forwarded-protocol header.
- React renders document text as text, preventing user content from becoming HTML. The application does not accept file uploads in this iteration.
- Database migrations capture schema changes. Decision updates are conditional and atomic. The UI shows failures and disables in-flight actions.
- SQLite is used only for local development. Vercel deployments require PostgreSQL through `DATABASE_URL`. The unpaginated listing suits the challenge's small dataset; add pagination, rate limiting, structured logs, monitoring, backup/restore checks, and deployment health checks as usage grows.
- If file uploads become necessary, put file metadata on submissions and store files in private object storage with type/size checks, malware scanning, and authorized download URLs. Notifications and audit events can be added as separate modules.

## Trade-offs and follow-up

The challenge specifies a two-hour budget, so this version prioritizes the complete submit-review-track loop, authorization, and tests. It does not include user registration, file uploads, comments, decision reversal, notification delivery, pagination, or public hosting. Those are deliberate extension points, not prerequisites for the requested first iteration.

The Vercel configuration serves the built React assets at `/` and Django at `/api` on one HTTPS origin. Never use the local demo credentials in production.

## Deploy with GitHub Actions and Vercel

The root `vercel.json` defines one Vite frontend service and one Django backend service. Vercel Services currently requires **Framework Preset: Services** in the Vercel project's Build and Deployment settings. Use this repository's root directory as the Vercel project root. The project configuration disables Vercel's automatic Git deployments so the GitHub Action owns production deployment.

1. Create a Vercel project for this repository and set its framework preset to **Services**. Enable **Automatically expose System Environment Variables** in its Environment Variables settings, so the backend can allow the deployment host.
2. Connect a PostgreSQL database, such as a Vercel Marketplace Postgres integration, and set these **Vercel Production environment variables**: `DATABASE_URL` (a PostgreSQL URL) and a long random `DJANGO_SECRET_KEY`. Add `DJANGO_ALLOWED_HOSTS` and `DJANGO_CSRF_TRUSTED_ORIGINS` if you use an additional custom domain. Set `DJANGO_DEBUG=0` explicitly.
3. Link the project with the Vercel CLI (`vercel link`) and get `orgId` and `projectId` from `.vercel/project.json`. Create a scoped Vercel access token.
4. Add these **GitHub repository secrets**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DEMO_SUBMITTER_PASSWORD`, and `DEMO_REVIEWER_PASSWORD`. The database URL and Django secret key must match the values in Vercel. Choose new demo passwords for the public deployment.
5. Push to `main` or run the workflow manually from `main`. The Action runs the tests, applies migrations, creates demo users, builds both services, and deploys the prebuilt result. Its job summary contains the production URL. Pull requests run tests without deploying.

The deployment job fails with a clear missing-secret message until those account settings are complete. Do not commit `.vercel/`, database URLs, passwords, or tokens; `.vercel/` and local database files are ignored by Git.

## Submission checklist

- Put this code in a private repository and share access with the hiring address in the challenge document.
- Record the requested approximately five-minute walkthrough and add its link here.
- If hosted, add the public application URL here. Otherwise, the local steps above are sufficient to run it.

## AI tools used

OpenAI Codex assisted with the architecture, code scaffolding, API and UI implementation, tests, documentation, and debugging. The resulting behavior was checked with the test suite and a production frontend build.
