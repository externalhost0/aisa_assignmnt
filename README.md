# Campus Safety Incident Manager

An AI-augmented incident management dashboard for university campus safety teams. Replaces manual spreadsheet tracking with intelligent intake, real-time prioritization, and pattern analysis — deployable across multiple campuses from a single instance.

---

## What It Does

**Problem:** Safety dispatchers log dozens of incidents per day into spreadsheets. No fast way to see what needs attention now, no automatic prioritization, no visibility into patterns across shifts.

**Solution:** A three-panel web app:

1. **Intelligent Intake** — dispatcher types a freeform description; Claude classifies it, assigns priority (P1–P3) with a rationale, extracts location and people involved, and flags if it resembles a recent cluster.
2. **Live Incident Board** — filterable table sorted by priority, with one-click status transitions (open → dispatched → resolved), a stale-P1 alert banner, and CSV export.
3. **Analytics** — hot-spot locations, incidents-by-hour bar chart, and an on-demand AI shift digest for handoff notes.

Every AI output is editable by the dispatcher before saving. The AI drafts; the human decides.

---

## Architecture

```
┌─────────────────────────────────────┐
│     React + Vite + Mantine v7       │  :5173 (dev)
│   IncidentForm | Board | Analytics  │
└────────────────┬────────────────────┘
                 │ REST — axios (/api/*)
                 │ Vite proxy in dev, same origin in prod
┌────────────────▼────────────────────┐
│         FastAPI (Python)            │  :8000
│  /incidents  /classify  /digest     │
│  /analytics  /campuses              │
└──────┬─────────────────┬────────────┘
       │                 │
┌──────▼──────┐   ┌──────▼──────────┐
│   SQLite    │   │   Claude API    │
│ (SQLAlchemy)│   │ claude-sonnet   │
└─────────────┘   └─────────────────┘
```

- All Claude API calls happen server-side. The API key never leaves the backend.
- In dev, Vite proxies `/api/*` → `localhost:8000`. No CORS config needed locally.
- SQLite for development; swap to Postgres by changing one env var.

---

## Repo Structure

```
asia_proj1/
├── backend/
│   ├── main.py              # App factory, CORS, startup seed
│   ├── database.py          # SQLAlchemy engine, get_db dependency
│   ├── models.py            # Campus, Incident, AIAuditLog
│   ├── schemas.py           # Pydantic schemas (mirrors frontend types)
│   ├── ai/
│   │   ├── classifier.py    # Claude intake call + pattern flag logic
│   │   └── summarizer.py    # Claude shift digest
│   ├── routers/
│   │   ├── incidents.py     # CRUD + CSV export
│   │   ├── classify.py      # POST /classify
│   │   ├── digest.py        # POST /digest
│   │   ├── analytics.py     # Hotspots + heatmap (pure SQL)
│   │   └── campuses.py      # Campus management
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # AppShell + tab navigation
│   │   ├── api/client.ts         # Typed axios wrapper
│   │   ├── types/incident.ts     # TypeScript interfaces
│   │   ├── hooks/useIncidents.ts # 30s polling hook
│   │   └── components/
│   │       ├── IncidentForm.tsx      # Analyze → preview → save
│   │       ├── IncidentBoard.tsx     # Table + filters + status controls
│   │       ├── AnalyticsPanel.tsx    # Charts + digest
│   │       └── PriorityBadge.tsx     # P1/P2/P3 badge
│   ├── vite.config.ts
│   └── package.json
├── .gitignore
├── CLAUDE.md
└── README.md
```

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in ANTHROPIC_KEY
uvicorn main:app --reload --port 8000
```

The database is created automatically on first run. A "Demo Campus" is seeded so the app works immediately without manual setup.

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### 3. Environment Variables

| Variable | File | Description |
|---|---|---|
| `ANTHROPIC_KEY` | `backend/.env` | Claude API key — get one at console.anthropic.com |
| `DATABASE_URL` | `backend/.env` | Optional. Defaults to `sqlite:///./incidents.db` |

No frontend env vars needed in development.

---

## AI Integration

| Trigger | Endpoint | What Claude does |
|---|---|---|
| Dispatcher clicks "Analyze" | `POST /classify` | Extracts type, priority + rationale, location, people; compares to last 48h for pattern flag |
| "Generate Digest" button | `POST /digest` | Summarizes last 12h of incidents into plain-English handoff notes |
| Analytics page load | `GET /analytics/*` | Pure SQL aggregation — no AI in the read path |

Every Claude call is logged to `AIAuditLog` (input, output, model, timestamp) for audit trail.

---

## Multi-Campus Design

- Every `Incident` row has a `campus_id` FK — a single deployment serves multiple campuses without data bleed.
- Each `Campus` stores its own category list and priority rule descriptions in a JSON settings column.
- Adding a new campus is one `POST /campuses` call; the frontend campus selector updates automatically.

---

## Productization Path

- [ ] Swap SQLite → Postgres: change `DATABASE_URL` in `.env`
- [ ] Add auth: Clerk or Auth0 slots in as FastAPI middleware
- [ ] Per-campus branding: extend `Campus.settings` JSON
- [ ] Push notifications: replace 30s polling with a WebSocket on `POST /incidents`
- [ ] Production deploy: `npm run build` → copy `dist/` to `backend/static/`, serve via FastAPI `StaticFiles`
