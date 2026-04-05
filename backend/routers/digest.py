from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from ai.summarizer import generate_digest, MODEL

router = APIRouter()


@router.post("/digest", response_model=schemas.DigestResponse)
async def digest(body: schemas.DigestRequest, db: Session = Depends(get_db)):
    campus = db.query(models.Campus).filter(models.Campus.id == body.campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")

    cutoff = datetime.now(timezone.utc) - timedelta(hours=body.hours)
    incidents = (
        db.query(models.Incident)
        .filter(
            models.Incident.campus_id == body.campus_id,
            models.Incident.created_at >= cutoff,
        )
        .order_by(models.Incident.priority.asc(), models.Incident.created_at.desc())
        .all()
    )

    incident_dicts = [
        {
            "type": inc.type,
            "priority": inc.priority,
            "location": inc.location,
            "status": inc.status,
            "pattern_flag": inc.pattern_flag,
            "created_at": inc.created_at.strftime("%Y-%m-%d %H:%M"),
        }
        for inc in incidents
    ]

    audit_input = f"campus_id={body.campus_id}\nhours={body.hours}\nincident_count={len(incident_dicts)}"
    audit_output = ""

    try:
        text = await generate_digest(incidents=incident_dicts, hours=body.hours)
        audit_output = text
        return schemas.DigestResponse(text=text)
    finally:
        log = models.AIAuditLog(
            call_type="digest",
            input_text=audit_input,
            output_text=audit_output or "error",
            model=MODEL,
        )
        db.add(log)
        db.commit()
