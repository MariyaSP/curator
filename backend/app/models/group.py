from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class Group(Base, TimestampMixin):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    curator_id = Column(Integer, ForeignKey("curators.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    start_year = Column(Integer, nullable=False)
    end_year = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)

    # Отношения
    college = relationship("College", back_populates="groups")
    curator = relationship("Curator", back_populates="groups")
    group_students = relationship("GroupStudent", back_populates="group")
    event_participants = relationship("EventParticipant", back_populates="group")