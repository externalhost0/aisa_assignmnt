# Backend

FastAPI service. Owns the database and all Claude API calls.

## Running

```bash
source venv/bin/activate
cp .env.example .env   # set ANTHROPIC_KEY
uvicorn main:app --reload --port 8000
```

http://localhost:8000/docs — Swagger UI with all routes.

The SQLite database (`incidents.db`) and a default "Demo Campus" are created automatically on first run.

## Environment

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_KEY` | — | Required for `/classify` and `/digest` |
| `DATABASE_URL` | `sqlite:///./incidents.db` | Swap to a Postgres URL for production |

## Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/incidents` | List, filterable by `campus_id`, `status`, `type`, `priority` |
| `POST` | `/incidents` | Create a classified incident |
| `PATCH` | `/incidents/{id}` | Update status, priority, location, type |
| `GET` | `/incidents/export` | CSV download, params: `campus_id`, `date_from`, `date_to` |
| `POST` | `/classify` | `{description, campus_id}` → AI classification |
| `POST` | `/digest` | `{campus_id, hours}` → AI shift summary |
| `GET` | `/analytics/hotspots` | Top locations by count, params: `campus_id`, `days` |
| `GET` | `/analytics/heatmap` | Count by hour × day-of-week, params: `campus_id`, `days` |
| `GET` | `/campuses` | List all campuses |
| `POST` | `/campuses` | Create a campus |

## Key Design Decisions

**Two-step intake:** `/classify` and `/incidents` are separate endpoints. The frontend shows the AI result for dispatcher review before calling `/incidents` to save. The AI is never auto-saved.

**Pattern flagging:** `/classify` fetches the last 48h of incidents (lightweight fields only) and includes them in the Claude prompt. Claude sets `pattern_flag` if the new incident resembles a cluster.

**Audit trail:** Every Claude call is logged to `AIAuditLog` (input, output, model, timestamp) inside a `try/finally`, so failed calls are also recorded.

**Lazy client init:** `ai/classifier.py` and `ai/summarizer.py` use `_get_client()` instead of a module-level `AsyncAnthropic` instance. This ensures `ANTHROPIC_KEY` is read after `load_dotenv()` runs, not at import time.

## Swapping to Postgres

```
DATABASE_URL=postgresql://user:pass@host:5432/campus_safety
```

Change the env var. SQLAlchemy handles the rest. Add `psycopg2-binary` to `requirements.txt`.
