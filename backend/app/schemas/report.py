from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


# ========== ШАБЛОНЫ ОТЧЁТОВ ==========

class ReportTemplateBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    report_type: str = Field(..., max_length=50)  # student_list, social_passport, etc.
    template_file_path: str
    template_file_name: str
    template_type: str = Field(..., max_length=10)  # docx или xlsx
    placeholders: Optional[List[str]] = None


class ReportTemplateCreate(ReportTemplateBase):
    pass


class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    report_type: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class ReportTemplateRead(ReportTemplateBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== ГЕНЕРИРОВАННЫЕ ОТЧЁТЫ ==========

class GeneratedReportBase(BaseModel):
    curator_id: int
    template_id: int
    academic_year_id: Optional[int] = None
    file_path: str
    file_format: str  # pdf, docx, xlsx
    params: Optional[Dict[str, Any]] = None


class GeneratedReportCreate(GeneratedReportBase):
    pass


class GeneratedReportRead(GeneratedReportBase):
    id: int
    generated_at: datetime
    template_name: Optional[str] = None

    class Config:
        from_attributes = True


# ========== ПАРАМЕТРЫ ГЕНЕРАЦИИ ==========

class ReportGenerateParams(BaseModel):
    template_id: int
    group_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    format: str = "pdf"