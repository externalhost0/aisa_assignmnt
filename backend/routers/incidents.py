import csv
import io
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import case
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter()


def _get_or_404(db: Session, incident_id: int) -> models.Incident:
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


# NOTE: /export must be registered before /{id} to prevent FastAPI matching "export" as an int id
@router.get("/export")
def export_incidents(
    campus_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Incident)
    if campus_id:
        query = query.filter(models.Incident.campus_id == campus_id)
    if date_from:
        query = query.filter(models.Incident.created_at >= date_from)
    if date_to:
        query = query.filter(models.Incident.created_at <= date_to)

    incidents = query.order_by(models.Incident.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "campus_id", "type", "priority", "priority_reason",
        "location", "people_involved", "status", "pattern_flag",
        "raw_description", "created_at", "updated_at"
    ])
    for inc in incidents:
        writer.writerow([
            inc.id, inc.campus_id, inc.type, inc.priority, inc.priority_reason,
            inc.location or "", inc.people_involved or "", inc.status,
            inc.pattern_flag or "", inc.raw_description,
            inc.created_at.isoformat(), inc.updated_at.isoformat()
        ])

    output.seek(0)
    filename = f"incidents_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("", response_model=list[schemas.IncidentRead])
def list_incidents(
    campus_id: Optional[int] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Incident)
    if campus_id:
        query = query.filter(models.Incident.campus_id == campus_id)
    if status:
        query = query.filter(models.Incident.status == status)
    if type:
        query = query.filter(models.Incident.type == type)
    if priority:
        query = query.filter(models.Incident.priority == priority)

    return query.order_by(
        case((models.Incident.pinned_at.is_(None), 1), else_=0),  # pinned rows first
        models.Incident.pinned_at.asc(),                           # earliest pin = top of queue
        models.Incident.priority.asc(),
        models.Incident.created_at.desc(),
    ).all()


@router.post("", response_model=schemas.IncidentRead, status_code=201)
def create_incident(body: schemas.IncidentCreate, db: Session = Depends(get_db)):
    campus = db.query(models.Campus).filter(models.Campus.id == body.campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")

    now = datetime.now(timezone.utc)
    incident = models.Incident(
        **body.model_dump(),
        created_at=now,
        updated_at=now,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=schemas.IncidentRead)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, incident_id)


@router.patch("/{incident_id}", response_model=schemas.IncidentRead)
def update_incident(
    incident_id: int,
    body: schemas.IncidentPatch,
    db: Session = Depends(get_db),
):
    incident = _get_or_404(db, incident_id)
    patch_data = body.model_dump(exclude_unset=True)
    if "pinned" in patch_data:
        pinned = patch_data.pop("pinned")
        patch_data["pinned_at"] = datetime.now(timezone.utc) if pinned else None
    for field, value in patch_data.items():
        setattr(incident, field, value)
    incident.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)
    return incident
