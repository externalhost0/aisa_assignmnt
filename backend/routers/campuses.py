from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter()


@router.get("", response_model=list[schemas.CampusRead])
def list_campuses(db: Session = Depends(get_db)):
    return db.query(models.Campus).order_by(models.Campus.name).all()


@router.post("", response_model=schemas.CampusRead, status_code=201)
def create_campus(body: schemas.CampusCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Campus).filter(models.Campus.name == body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Campus name already exists")
    campus = models.Campus(name=body.name)
    if body.settings:
        campus.settings = body.settings
    db.add(campus)
    db.commit()
    db.refresh(campus)
    return campus


@router.get("/{campus_id}", response_model=schemas.CampusRead)
def get_campus(campus_id: int, db: Session = Depends(get_db)):
    campus = db.query(models.Campus).filter(models.Campus.id == campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    return campus
