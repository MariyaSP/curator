# backend/app/models/event.py
from sqlalchemy import Column, Integer, String, Text, Date, Time, ForeignKey, Boolean, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from .enums import EventType, RecurrenceType
from sqlalchemy import Index


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("event_categories.id"), nullable=False)
    curator_id = Column(Integer, ForeignKey("curators.id"), nullable=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    parent_event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=True)  # ← ДОБАВЛЕНО

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    event_type = Column(Enum(EventType), nullable=False)
    is_recurring = Column(Boolean, default=False, nullable=False, server_default='false')
    recurrence_type = Column(Enum(RecurrenceType), nullable=True)
    recurrence_end_date = Column(Date, nullable=True)

    visibility = Column(JSONB, default=list, nullable=False)

    __table_args__ = (
        Index('ix_events_college_id', 'college_id'),
        Index('ix_events_curator_id', 'curator_id'),
        Index('ix_events_category_id', 'category_id'),
        Index('ix_events_event_date', 'event_date'),
        Index('ix_events_academic_year_id', 'academic_year_id'),
        Index('ix_events_created_by', 'created_by'),
        Index('ix_events_parent_event_id', 'parent_event_id'),
    )

    college = relationship("College", back_populates="events")
    category = relationship("EventCategory", back_populates="events")
    curator = relationship("Curator", back_populates="events")
    academic_year = relationship("AcademicYear", back_populates="events")
    participants = relationship(
        "EventParticipant", 
        back_populates="event", 
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    completions = relationship(
        "EventCompletion", 
        back_populates="event", 
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    creator = relationship("User", foreign_keys=[created_by])
    parent_event = relationship("Event", remote_side=[id], foreign_keys=[parent_event_id])