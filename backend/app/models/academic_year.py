from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class AcademicYear(Base, TimestampMixin):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    name = Column(String(20), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False)

    # Отношения
    college = relationship("College", back_populates="academic_years")
    students = relationship("Student", back_populates="academic_year")
    competitions = relationship("Competition", back_populates="academic_year")
    events = relationship("Event", back_populates="academic_year")
    generated_reports = relationship("GeneratedReport", back_populates="academic_year")