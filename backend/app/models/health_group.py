from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from .base import Base

class HealthGroup(Base):
    __tablename__ = "health_groups"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(100), nullable=False)

    students = relationship("Student", back_populates="health_group")