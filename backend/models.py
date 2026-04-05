from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy import String, Text, JSON, ForeignKey, DateTime, Index, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Campus(Base):
    __tablename__ = "campuses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    settings: Mapped[Optional[Any]] = mapped_column(JSON, default=lambda: {
        "categories": ["medical", "noise", "security", "fire", "other"],
        "priority_rules": {
            "1": "Immediate risk to life or safety",
            "2": "Moderate concern, requires attention",
            "3": "Low priority, informational"
        }
    })
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="campus")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campuses.id"), nullable=False, index=True)
    raw_description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    priority: Mapped[int] = mapped_column(nullable=False)  # 1=critical, 2=moderate, 3=low
    priority_reason: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    people_involved: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open", nullable=False)  # open|dispatched|resolved
    pattern_flag: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pinned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    ai_classification_raw: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    campus: Mapped["Campus"] = relationship("Campus", back_populates="incidents")
    audit_logs: Mapped[list["AIAuditLog"]] = relationship("AIAuditLog", back_populates="incident")

    __table_args__ = (
        Index("ix_incidents_campus_status", "campus_id", "status"),
        Index("ix_incidents_campus_created", "campus_id", "created_at"),
    )


class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incident_id: Mapped[Optional[int]] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    call_type: Mapped[str] = mapped_column(String, nullable=False)  # classify|digest
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    output_text: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    incident: Mapped[Optional["Incident"]] = relationship("Incident", back_populates="audit_logs")
