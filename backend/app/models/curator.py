from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class Curator(Base, TimestampMixin):
    __tablename__ = "curators"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)

    # Отношения
    user = relationship("User", back_populates="curator")
    college = relationship("College", back_populates="curators")
    groups = relationship("Group", back_populates="curator")
    events = relationship("Event", back_populates="curator")
    competitions = relationship("Competition", back_populates="curator")
    generated_reports = relationship("GeneratedReport", back_populates="curator")