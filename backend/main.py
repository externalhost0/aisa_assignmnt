from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

from database import engine, Base, SessionLocal
import models  # registers all ORM models with Base
from routers import incidents, classify, digest, analytics, campuses


def _seed_default_campus():
    """Create a default campus on first run so the app works immediately."""
    db = SessionLocal()
    try:
        if db.query(models.Campus).count() == 0:
            default = models.Campus(name="Demo Campus")
            db.add(default)
            db.commit()
    finally:
        db.close()


def _migrate():
    """Apply lightweight schema migrations for SQLite (create_all won't add new columns)."""
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(incidents)"))]
        if "notes" not in cols:
            conn.execute(text("ALTER TABLE incidents ADD COLUMN notes TEXT"))
            conn.commit()
        if "pinned_at" not in cols:
            conn.execute(text("ALTER TABLE incidents ADD COLUMN pinned_at DATETIME"))
            conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_default_campus()
    _migrate()
    yield


app = FastAPI(
    title="Campus Safety Incident Manager",
    description="AI-augmented incident management for university campus safety teams.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
app.include_router(classify.router, tags=["ai"])
app.include_router(digest.router, tags=["ai"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(campuses.router, prefix="/campuses", tags=["campuses"])


@app.get("/health")
def health():
    return {"status": "ok"}
