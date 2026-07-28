from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class College(Base, TimestampMixin):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    short_name = Column(String(50))
    address = Column(String(300))
    phone = Column(String(20))
    email = Column(String(100))
    is_active = Column(Boolean, default=True)

    # Отношения
    users = relationship("User", back_populates="college")
    students = relationship("Student", back_populates="college")
    curators = relationship("Curator", back_populates="college")
    groups = relationship("Group", back_populates="college")
    events = relationship("Event", back_populates="college")
    competitions = relationship("Competition", back_populates="college")
    academic_years = relationship("AcademicYear", back_populates="college")
    audit_logs = relationship("AuditLog", back_populates="college")
    report_templates = relationship("ReportTemplate", back_populates="college")
    specialties = relationship("Specialty", back_populates="college")