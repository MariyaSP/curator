# backend/app/api/v1/references.py

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import re
import io
import pandas as pd

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    SocialStatus, HealthGroup, DocumentType, EventCategory, 
    Specialty, AcademicYear, Student, User, Group, Event, GeneratedReport
)
from app.schemas import (
    SocialStatusRead, HealthGroupRead, DocumentTypeRead, 
    EventCategoryRead, SpecialtyRead, AcademicYearRead
)

router = APIRouter(prefix="/references", tags=["References"])

# ===== МАППИНГ ТИПОВ =====
MODELS = {
    'social-statuses': (SocialStatus, SocialStatusRead),
    'health-groups': (HealthGroup, HealthGroupRead),
    'document-types': (DocumentType, DocumentTypeRead),
    'event-categories': (EventCategory, EventCategoryRead),
    'specialties': (Specialty, SpecialtyRead),
    'academic-years': (AcademicYear, AcademicYearRead),
}

def transliterate(text: str) -> str:
    mapping = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': '_', '-': '_', ',': '', '.': '', '!': '', '?': '', ':': '',
        ';': '', '"': '', "'": '', '(': '', ')': '', '«': '', '»': '',
    }
    result = ''
    for char in text.lower():
        result += mapping.get(char, char if char.isascii() and char.isalnum() else '_')
    result = re.sub(r'_+', '_', result).strip('_')
    return result[:50]

# ===== GET =====
@router.get("/{ref_type}")
def get_references(ref_type: str, db: Session = Depends(get_db)):
    if ref_type not in MODELS:
        raise HTTPException(status_code=404, detail="Тип справочника не найден")
    model, schema = MODELS[ref_type]
    items = db.query(model).order_by(model.id).all()
    
    result = []
    for item in items:
        item_dict = {}
        for column in model.__table__.columns:
            item_dict[column.name] = getattr(item, column.name)
        result.append(schema.model_validate(item_dict))
    
    return result

# ===== POST =====
@router.post("/{ref_type}", status_code=status.HTTP_201_CREATED)
def create_reference(
    ref_type: str,
    name: str = Query(...),
    code: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    is_active: bool = Query(True),
    audience: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if ref_type not in MODELS:
        raise HTTPException(status_code=404, detail="Тип справочника не найден")
    model, schema = MODELS[ref_type]
    
    data = {"name": name}
    if ref_type != 'document-types':
        data["is_active"] = is_active
    
    college_id = current_user.college_id if current_user.college_id else 1
    
    if ref_type in ['social-statuses', 'document-types', 'health-groups']:
        generated_code = code or transliterate(name)
        data["code"] = generated_code[:10]
    if ref_type == 'specialties':
        data["college_id"] = college_id
        data["code"] = transliterate(name)[:15]
    if ref_type == 'event-categories':
        data["college_id"] = college_id
        if color:
            data["color"] = color
        if audience:
            data["audience"] = audience
    if ref_type == 'academic-years':
        data["college_id"] = college_id
        data["start_date"] = start_date
        data["end_date"] = end_date
    
    existing = db.query(model).filter(model.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Запись с таким названием уже существует")
    
    item = model(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return schema.model_validate(item)

# ===== ИМПОРТ СПЕЦИАЛЬНОСТЕЙ =====
@router.post("/specialties/import", status_code=status.HTTP_200_OK)
async def import_specialties(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Файл должен быть в формате Excel (.xlsx или .xls)")
    
    try:
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        name_column = None
        for col in df.columns:
            if 'название' in str(col).lower() or 'специальност' in str(col).lower():
                name_column = col
                break
        
        if name_column is None:
            raise HTTPException(status_code=400, detail="Не найдена колонка «Название специальности»")
        
        imported = 0
        skipped = 0
        errors = []
        
        college_id = current_user.college_id if current_user.college_id else 1
        
        for idx, row in df.iterrows():
            name = str(row[name_column]).strip() if pd.notna(row[name_column]) else ''
            
            if not name:
                skipped += 1
                continue
            
            existing = db.query(Specialty).filter(Specialty.name == name).first()
            if existing:
                skipped += 1
                errors.append(f"Строка {idx + 2}: «{name}» — уже существует")
                continue
            
            code = transliterate(name)[:15]
            
            specialty = Specialty(
                college_id=college_id,
                code=code,
                name=name[:200],
                is_active=True
            )
            db.add(specialty)
            imported += 1
        
        db.commit()
        
        return {
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:10],
            "message": f"Импортировано: {imported}, пропущено: {skipped}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка обработки файла: {str(e)}")

# ===== PUT =====
@router.put("/{ref_type}/{item_id}")
def update_reference(
    ref_type: str,
    item_id: int,
    name: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    audience: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    if ref_type not in MODELS:
        raise HTTPException(status_code=404, detail="Тип справочника не найден")
    model, schema = MODELS[ref_type]
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    
    # Проверка: нельзя деактивировать учебный год со связанными студентами
    if ref_type == 'academic-years' and is_active == False:
        students_count = db.query(Student).filter(Student.academic_year_id == item_id).count()
        if students_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Невозможно деактивировать учебный год. С ним связаны студенты ({students_count})."
            )
    
    # Для групп здоровья — если деактивируем, переводим студентов на Основную
    if ref_type == 'health-groups' and is_active == False and item_id != 1:
        db.query(Student).filter(Student.health_group_id == item_id).update(
            {Student.health_group_id: 1}
        )
    
    if name is not None:
        item.name = name
    
    if color is not None and ref_type == 'event-categories':
        item.color = color
    
    if audience is not None and ref_type == 'event-categories':
        item.audience = audience
    
    if is_active is not None:
        item.is_active = is_active
    
    if ref_type == 'academic-years':
        if start_date is not None:
            item.start_date = start_date
        if end_date is not None:
            item.end_date = end_date
    
    db.commit()
    db.refresh(item)
    return schema.model_validate(item)

# ===== DELETE =====
@router.delete("/{ref_type}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reference(ref_type: str, item_id: int, db: Session = Depends(get_db)):
    if ref_type not in MODELS:
        raise HTTPException(status_code=404, detail="Тип справочника не найден")
    model, _ = MODELS[ref_type]
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    
    # Для групп здоровья — заменяем на Основную (id=1) перед удалением
    if ref_type == 'health-groups' and item_id != 1:
        db.query(Student).filter(Student.health_group_id == item_id).update(
            {Student.health_group_id: 1}
        )
    
    # Проверка: нельзя удалить специальность, если есть группы с этой специальностью
    if ref_type == 'specialties':
        groups_count = db.query(Group).filter(Group.specialty_id == item_id).count()
        if groups_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Невозможно удалить специальность. Существуют группы ({groups_count} шт.), привязанные к этой специальности."
            )
    
    # Проверка: нельзя удалить учебный год, если есть связанные данные
    if ref_type == 'academic-years':
        students_count = db.query(Student).filter(Student.academic_year_id == item_id).count()
        events_count = db.query(Event).filter(Event.academic_year_id == item_id).count()
        reports_count = db.query(GeneratedReport).filter(GeneratedReport.academic_year_id == item_id).count()
        
        total = students_count + events_count + reports_count
        
        if total > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Невозможно удалить учебный год. С ним связаны: студенты ({students_count}), события ({events_count}), отчёты ({reports_count})."
            )
    
    db.delete(item)
    db.commit()
    return None