from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
import schemas

router = APIRouter()


@router.get("/hotspots", response_model=list[schemas.HotspotEntry])
def hotspots(
    campus_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        text("""
            SELECT location, COUNT(*) as count
            FROM incidents
            WHERE campus_id = :campus_id
              AND created_at >= :cutoff
              AND location IS NOT NULL
              AND location != ''
            GROUP BY location
            ORDER BY count DESC
            LIMIT 10
        """),
        {"campus_id": campus_id, "cutoff": cutoff.isoformat()},
    ).fetchall()

    return [{"location": row[0], "count": row[1]} for row in rows]


@router.get("/heatmap", response_model=list[schemas.HeatmapCell])
def heatmap(
    campus_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    # SQLite: strftime('%H') = hour 00–23, strftime('%w') = day 0=Sunday–6=Saturday
    rows = db.execute(
        text("""
            SELECT
                CAST(strftime('%H', created_at) AS INTEGER) as hour,
                CAST(strftime('%w', created_at) AS INTEGER) as day,
                COUNT(*) as count
            FROM incidents
            WHERE campus_id = :campus_id
              AND created_at >= :cutoff
            GROUP BY hour, day
            ORDER BY day, hour
        """),
        {"campus_id": campus_id, "cutoff": cutoff.isoformat()},
    ).fetchall()

    return [{"hour": row[0], "day": row[1], "count": row[2]} for row in rows]
