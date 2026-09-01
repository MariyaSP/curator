# backend/app/models/event_participant.py
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class EventParticipant(Base, TimestampMixin):
    __tablename__ = "event_participants"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)

    event = relationship("Event", back_populates="participants")
    group = relationship("Group", back_populates="event_participants")