from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from ai.classifier import classify_incident, MODEL

router = APIRouter()


@router.post("/classify", response_model=schemas.ClassifyResponse)
async def classify(body: schemas.ClassifyRequest, db: Session = Depends(get_db)):
    campus = db.query(models.Campus).filter(models.Campus.id == body.campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")

    # Fetch last 48h incidents for pattern detection (lightweight fields only)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    recent = (
        db.query(
            models.Incident.id,
            models.Incident.type,
            models.Incident.priority,
            models.Incident.location,
            models.Incident.created_at,
        )
        .filter(
            models.Incident.campus_id == body.campus_id,
            models.Incident.created_at >= cutoff,
        )
        .order_by(models.Incident.created_at.desc())
        .limit(20)
        .all()
    )

    recent_dicts = [
        {
            "id": r.id,
            "type": r.type,
            "priority": r.priority,
            "location": r.location,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
        }
        for r in recent
    ]

    audit_input = f"campus_id={body.campus_id}\ndescription={body.description}\nrecent_count={len(recent_dicts)}"
    audit_output = ""

    try:
        result, raw_text = await classify_incident(
            description=body.description,
            campus_id=body.campus_id,
            recent_incidents=recent_dicts,
        )
        audit_output = raw_text
        return schemas.ClassifyResponse(**result)
    finally:
        log = models.AIAuditLog(
            call_type="classify",
            input_text=audit_input,
            output_text=audit_output or "error",
            model=MODEL,
        )
        db.add(log)
        db.commit()
