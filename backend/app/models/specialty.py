from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Specialty(Base):
    __tablename__ = "specialties"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(15), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)

    # Отношения
    college = relationship("College", back_populates="specialties")
    groups = relationship("Group", back_populates="specialty")