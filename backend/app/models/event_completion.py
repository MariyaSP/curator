# backend/app/models/event_completion.py
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin


class EventCompletion(Base, TimestampMixin):
    __tablename__ = "event_completions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint('event_id', 'user_id', name='ix_event_completions_event_user'),
    )

    event = relationship("Event", back_populates="completions")
    user = relationship("User")