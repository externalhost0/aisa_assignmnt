# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Campus safety incident management dashboard. Dispatchers submit freeform incident descriptions; Claude classifies them, assigns severity (High/Medium/Low), and flags patterns across recent incidents. See `README.md` for full architecture.

## Commands

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

API docs at http://localhost:8000/docs. Both services must run simultaneously in development.

### Frontend

```bash
cd frontend
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run lint
```

Vite proxies `/api/*` → `http://localhost:8000` — no CORS config needed in dev.

## Architecture

```
frontend (React/Vite :5173) ──REST /api/*──▶ backend (FastAPI :8000)
                                                    ├── SQLite (incidents.db)
                                                    └── Claude API (classify + digest)
```

The backend is the only process that touches the DB or calls Claude. The frontend is a pure REST client.

## Environment

- **`ANTHROPIC_KEY`** in `backend/.env` — the Anthropic API key. Copy `backend/.env.example` to get started.
- **`DATABASE_URL`** in `backend/.env` — defaults to `sqlite:///./incidents.db`. Set to a Postgres URL to upgrade.

## Stack

**Backend:** FastAPI · SQLAlchemy (SQLite) · Pydantic v2 · `anthropic` SDK  
**Frontend:** React 19 · Vite · TypeScript · Mantine v7 · axios · Mantine Charts (recharts)

## Backend Structure

```
backend/
├── main.py          # App factory, CORS, lifespan (DB init + seed)
├── database.py      # Engine, SessionLocal, Base, get_db
├── models.py        # Campus, Incident, AIAuditLog ORM models
├── schemas.py       # Pydantic schemas — must stay in sync with frontend/src/types/incident.ts
├── ai/
│   ├── classifier.py   # classify_incident() — Claude call, includes 48h pattern context
│   └── summarizer.py   # generate_digest() — Claude shift summary
└── routers/
    ├── incidents.py    # CRUD + CSV export (/incidents/export registered before /{id})
    ├── classify.py     # POST /classify
    ├── digest.py       # POST /digest
    ├── analytics.py    # GET /analytics/hotspots + /heatmap (pure SQL, no Claude)
    └── campuses.py     # GET/POST /campuses
```

Key constraints:
- Every `Incident` carries `campus_id` — never omit it from queries.
- Every Claude call is logged to `AIAuditLog` inside a `try/finally`.
- `classifier.py` and `summarizer.py` use `_get_client()` (lazy init) — the Anthropic client must not be instantiated at module level.
- Route `GET /incidents/export` is registered before `GET /incidents/{id}` to prevent FastAPI matching "export" as an integer ID.

## Frontend Structure

```
frontend/src/
├── App.tsx               # AppShell + Tabs (intake / board / analytics), campus selector
├── api/client.ts         # axios wrapper — all API calls go through here
├── types/incident.ts     # TypeScript interfaces mirroring backend Pydantic schemas
├── hooks/useIncidents.ts # 30s polling hook
└── components/
    ├── IncidentForm.tsx      # Two-step flow: Analyze → editable preview → Save
    ├── IncidentBoard.tsx     # Filterable/searchable table, status transitions, stale-High alert
    ├── AnalyticsPanel.tsx    # Hotspot list, hourly bar chart, AI digest card
    └── PriorityBadge.tsx     # Color-coded High/Medium/Low badge
```

The intake flow is intentionally two-step: "Analyze" calls `/api/classify` and shows an editable preview; "Save" then calls `/api/incidents`. The AI result is never auto-saved.

Tab navigation is controlled by a single `activeTab` state in `App.tsx` — no router library.
