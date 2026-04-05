from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Campus ────────────────────────────────────────────────────────────────────

class CampusCreate(BaseModel):
    name: str
    settings: Optional[dict] = None


class CampusRead(BaseModel):
    id: int
    name: str
    settings: dict
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Incident ──────────────────────────────────────────────────────────────────

IncidentType = Literal["medical", "noise", "security", "fire", "other"]
Priority = Literal[1, 2, 3]
Status = Literal["open", "dispatched", "resolved"]


class IncidentCreate(BaseModel):
    campus_id: int
    raw_description: str
    type: IncidentType
    priority: Priority
    priority_reason: str
    location: Optional[str] = None
    people_involved: Optional[str] = None
    status: Status = "open"
    pattern_flag: Optional[str] = None
    ai_classification_raw: Optional[dict] = None


class IncidentRead(BaseModel):
    id: int
    campus_id: int
    raw_description: str
    type: IncidentType
    priority: Priority
    priority_reason: str
    location: Optional[str]
    people_involved: Optional[str]
    status: Status
    pattern_flag: Optional[str]
    notes: Optional[str]
    pinned_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IncidentPatch(BaseModel):
    status: Optional[Status] = None
    priority: Optional[Priority] = None
    location: Optional[str] = None
    people_involved: Optional[str] = None
    type: Optional[IncidentType] = None
    notes: Optional[str] = None
    pinned: Optional[bool] = None


# ── AI ────────────────────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    description: str = Field(..., min_length=5)
    campus_id: int


class ClassifyResponse(BaseModel):
    type: IncidentType
    priority: Priority
    priority_reason: str
    location: Optional[str] = None
    people_involved: Optional[str] = None
    pattern_flag: Optional[str] = None


class DigestRequest(BaseModel):
    campus_id: int
    hours: int = Field(default=12, ge=1, le=168)


class DigestResponse(BaseModel):
    text: str


# ── Analytics ─────────────────────────────────────────────────────────────────

class HotspotEntry(BaseModel):
    location: str
    count: int


class HeatmapCell(BaseModel):
    hour: int   # 0–23
    day: int    # 0=Sunday (SQLite strftime %w convention)
    count: int
