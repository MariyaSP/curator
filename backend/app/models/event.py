from sqlalchemy import Column, Integer, String, Text, Date, Time, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from .enums import EventType, RecurrenceType
from sqlalchemy import Index


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("event_categories.id"), nullable=False)
    curator_id = Column(Integer, ForeignKey("curators.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    event_type = Column(Enum(EventType), nullable=False)
    is_recurring = Column(Boolean, default=False)
    recurrence_type = Column(Enum(RecurrenceType), nullable=True)
    recurrence_end_date = Column(Date, nullable=True)

    is_completed = Column(Boolean, default=False)

    __table_args__ = (
        Index('ix_events_college_id', 'college_id'),
        Index('ix_events_curator_id', 'curator_id'),
        Index('ix_events_category_id', 'category_id'),
        Index('ix_events_event_date', 'event_date'),
        Index('ix_events_academic_year_id', 'academic_year_id'),
    )

    # Отношения
    college = relationship("College", back_populates="events")
    category = relationship("EventCategory", back_populates="events")
    curator = relationship("Curator", back_populates="events")
    academic_year = relationship("AcademicYear", back_populates="events")
    participants = relationship("EventParticipant", back_populates="event")