# Frontend

React + Vite + TypeScript + Mantine v7. Single-page app with three tabs: incident intake, live board, analytics.

## Running

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # production build → dist/
npm run lint
```

Requires the backend running at `localhost:8000`. Vite proxies `/api/*` there automatically — no env vars needed in dev.

## Stack

| Package | Role |
|---|---|
| React 19 + TypeScript | UI |
| Vite 8 | Dev server + bundler |
| Mantine v7 | Component library (AppShell, Table, Charts, Notifications) |
| axios | HTTP client |
| Mantine Charts (recharts) | Analytics bar chart |
| lucide-react | Icons |

## Structure

```
src/
├── App.tsx                   # AppShell + Tabs + campus selector
├── api/client.ts             # Typed axios wrapper — all API calls go here
├── types/incident.ts         # TypeScript interfaces (must match backend schemas.py)
├── hooks/useIncidents.ts     # Fetches incidents, polls every 30s
└── components/
    ├── IncidentForm.tsx       # Freeform input → AI analysis preview → save
    ├── IncidentBoard.tsx      # Filterable table, status transitions, stale-P1 alert
    ├── AnalyticsPanel.tsx     # Hotspot list, hourly bar chart, AI digest
    └── PriorityBadge.tsx      # Color-coded P1/P2/P3 chip
```

## Intake Flow

The intake is intentionally two-step to keep the dispatcher in the loop:

1. Type description → click **Analyze with AI** → calls `POST /api/classify`
2. AI result appears as an editable preview (type, priority, location, people)
3. Dispatcher reviews, edits if needed → click **Save Incident** → calls `POST /api/incidents`
4. Board refreshes; tab switches to the board automatically

## Adding to `types/incident.ts`

Any new fields added to the backend `Incident` model and Pydantic schemas must be reflected here, or TypeScript will silently drop them from API responses.
