from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin


class ReportTemplate(Base, TimestampMixin):
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    report_type = Column(String(50), nullable=False)

    template_file_path = Column(String(255), nullable=False)
    template_file_name = Column(String(100), nullable=False)
    template_type = Column(String(10), nullable=False)  # docx или xlsx

    placeholders = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)

    college = relationship("College", back_populates="report_templates")
    generated_reports = relationship("GeneratedReport", back_populates="template")