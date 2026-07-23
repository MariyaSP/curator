from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import os

from app.core.database import get_db
from app.schemas import ReportTemplateRead
from app.services import report_service
from app.core.security import get_current_user, get_current_curator
from app.models import User

router = APIRouter(prefix="/reports", tags=["Reports"])


# ========== ШАБЛОНЫ ОТЧЁТОВ ==========

@router.get("/templates", response_model=List[ReportTemplateRead])
def get_report_templates(
        report_type: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Получить список доступных шаблонов отчётов.
    Администратор видит все, куратор — только свои.
    """
    templates = report_service.get_templates(
        db,
        college_id=current_user.college_id,
        report_type=report_type
    )
    return [ReportTemplateRead.model_validate(t) for t in templates]


@router.post("/templates", response_model=ReportTemplateRead, status_code=status.HTTP_201_CREATED)
def create_report_template(
        template_in,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Создать новый шаблон отчёта (только для администратора)"""
    if current_user.role != 1:  # ADMIN
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    template = report_service.create_template(db, template_in, current_user.college_id)
    return ReportTemplateRead.model_validate(template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report_template(
        template_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Удалить шаблон отчёта (только для администратора)"""
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    report_service.delete_template(db, template_id, current_user.college_id)
    return None


# ========== ГЕНЕРАЦИЯ ОТЧЁТОВ ==========

@router.post("/generate")
def generate_report(
        template_id: int = Query(..., description="ID шаблона"),
        group_id: Optional[int] = Query(None, description="ID группы (для списка студентов)"),
        start_date: Optional[date] = Query(None, description="Начало периода"),
        end_date: Optional[date] = Query(None, description="Конец периода"),
        format: str = Query("pdf", description="Формат: pdf, docx, xlsx"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_curator)
):
    """
    Сгенерировать отчёт по шаблону.
    Куратор может генерировать отчёты для своих групп.
    """
    # Проверяем, что шаблон принадлежит колледжу пользователя
    template = report_service.get_template_by_id(db, template_id)
    if template.college_id != current_user.college_id:
        raise HTTPException(status_code=403, detail="Шаблон не принадлежит вашему колледжу")

    # Генерируем отчёт
    result = report_service.generate_report(
        db=db,
        template_id=template_id,
        group_id=group_id,
        start_date=start_date,
        end_date=end_date,
        format=format,
        curator_id=current_user.id,
        college_id=current_user.college_id
    )

    return FileResponse(
        result["file_path"],
        media_type=result["media_type"],
        filename=result["filename"]
    )


@router.get("/generated", response_model=List[dict])
def get_generated_reports(
        skip: int = Query(0, ge=0),
        limit: int = Query(15, ge=1, le=50),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_curator)
):
    """Получить список сгенерированных отчётов"""
    reports = report_service.get_generated_reports(
        db,
        curator_id=current_user.id,
        skip=skip,
        limit=limit
    )
    return reports


@router.get("/generated/{report_id}/download")
def download_generated_report(
        report_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_curator)
):
    """Скачать ранее сгенерированный отчёт"""
    result = report_service.get_generated_report_by_id(db, report_id, current_user.id)

    return FileResponse(
        result["file_path"],
        media_type=result["media_type"],
        filename=result["filename"]
    )


@router.delete("/generated/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_generated_report(
        report_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_curator)
):
    """Удалить сгенерированный отчёт"""
    report_service.delete_generated_report(db, report_id, current_user.id)
    return None