from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
from sqlalchemy import Index

class EventParticipant(Base):
    __tablename__ = "event_participants"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_event_participants_event_id', 'event_id'),
        Index('ix_event_participants_group_id', 'group_id'),
        Index('ix_event_participants_student_id', 'student_id'),
    )

    # Отношения
    event = relationship("Event", back_populates="participants")
    group = relationship("Group", back_populates="event_participants")
    student = relationship("Student")