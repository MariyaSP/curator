from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
from .enums import FileType

class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    curator_id = Column(Integer, ForeignKey("curators.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)

    # Информация о сгенерированном отчёте
    file_path = Column(String(255), nullable=False)
    file_format = Column(Enum(FileType), nullable=False)  # pdf, docx, xlsx
    params = Column(JSON, nullable=True)                  # параметры, с которыми генерировали
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Связи
    curator = relationship("Curator", back_populates="generated_reports")
    template = relationship("ReportTemplate", back_populates="generated_reports")
    academic_year = relationship("AcademicYear", back_populates="generated_reports")