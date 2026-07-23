from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class EventCategory(Base, TimestampMixin):
    __tablename__ = "event_categories"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    name = Column(String(50), nullable=False)
    color = Column(String(10), nullable=False)  # HEX-цвет
    is_active = Column(Boolean, default=True)

    # Отношения
    college = relationship("College")
    events = relationship("Event", back_populates="category")