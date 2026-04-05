from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Campus(Base):
    __tablename__ = "campuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    settings = Column(JSON, default=lambda: {
        "categories": ["medical", "noise", "security", "fire", "other"],
        "priority_rules": {
            "1": "Immediate risk to life or safety",
            "2": "Moderate concern, requires attention",
            "3": "Low priority, informational"
        }
    })
    created_at = Column(DateTime, default=utcnow)

    incidents = relationship("Incident", back_populates="campus")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=False, index=True)
    raw_description = Column(Text, nullable=False)
    type = Column(String, nullable=False)
    priority = Column(Integer, nullable=False)  # 1=critical, 2=moderate, 3=low
    priority_reason = Column(Text, nullable=False)
    location = Column(String, nullable=True)
    people_involved = Column(String, nullable=True)
    status = Column(String, default="open", nullable=False)  # open|dispatched|resolved
    pattern_flag = Column(Text, nullable=True)
    ai_classification_raw = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    campus = relationship("Campus", back_populates="incidents")
    audit_logs = relationship("AIAuditLog", back_populates="incident")

    __table_args__ = (
        Index("ix_incidents_campus_status", "campus_id", "status"),
        Index("ix_incidents_campus_created", "campus_id", "created_at"),
    )


class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    call_type = Column(String, nullable=False)  # classify|digest
    input_text = Column(Text, nullable=False)
    output_text = Column(Text, nullable=False)
    model = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    incident = relationship("Incident", back_populates="audit_logs")
