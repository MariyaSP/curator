# backend/app/api/v1/students.py
# 🟢 ИЗМЕНЕНИЯ:
# 1. model_dump заменён на dict (Pydantic v1)
# 2. Отладочные принты перенесены в update_student
# 3. В flat_fields добавлены inn, snils, medical_policy

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Student, Curator, GroupStudent, Group, Specialty, FamilyMember
from app.models import SocialStatus, HealthGroup
from app.schemas import StudentCreate, StudentUpdate, StudentRead
from app.schemas import SocialStatusRead, HealthGroupRead
from app.schemas import FamilyMemberRead
from fastapi import UploadFile, File
import os
import shutil


router = APIRouter(prefix="/students", tags=["Students"])
PHOTOS_DIR = "uploads/photos"

@router.get("/", response_model=List[StudentRead])
def get_all_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(15, ge=1, le=100),
    group_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список студентов.
    - Для администратора — все студенты
    - Для куратора — только студенты его групп
    """
    query = db.query(Student)

    if current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if curator and curator.groups:
            curator_group_ids = [g.id for g in curator.groups]
            query = query.join(GroupStudent).filter(
                GroupStudent.group_id.in_(curator_group_ids)
            )
        else:
            return []

    if group_id:
        query = query.join(GroupStudent).filter(GroupStudent.group_id == group_id)

    if search:
        query = query.join(User).filter(
            (User.full_name.ilike(f"%{search}%")) |
            (Student.personal_number.ilike(f"%{search}%"))
        )

    students = query.offset(skip).limit(limit).all()

    result = []
    for s in students:
        data = StudentRead.model_validate(s)

        if s.user:
            data.full_name = s.user.full_name

        if s.group_students:
            first_group = s.group_students[0]
            if first_group.group:
                group = first_group.group
                data.group_name = group.name
                
                if group.specialty_id:
                    specialty = db.query(Specialty).filter(
                        Specialty.id == group.specialty_id
                    ).first()
                    if specialty:
                        data.specialty_name = specialty.name
                
                if group.curator and group.curator.user:
                    data.curator_name = group.curator.user.full_name

        if s.gender:
            data.gender = s.gender.upper()
        if s.photo:
            data.photo = s.photo

        family = db.query(FamilyMember).filter(FamilyMember.student_id == s.id).all()
        data.family_members = [FamilyMemberRead.model_validate(m) for m in family]

        result.append(data)

    return result


@router.get("/references/social-statuses", response_model=List[SocialStatusRead])
def get_social_statuses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список социальных статусов (только активные)."""
    statuses = db.query(SocialStatus).filter(SocialStatus.is_active == True).all()
    return statuses


@router.get("/references/health-groups", response_model=List[HealthGroupRead])
def get_health_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список групп здоровья."""
    groups = db.query(HealthGroup).all()
    return groups


@router.get("/{student_id}", response_model=StudentRead)
def get_student_by_id(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить студента по ID (с проверкой прав)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    if current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if curator:
            curator_group_ids = [g.id for g in curator.groups]
            is_in_group = any(
                gs.group_id in curator_group_ids 
                for gs in student.group_students
            )
            if not is_in_group:
                raise HTTPException(
                    status_code=403, 
                    detail="У вас нет доступа к этому студенту"
                )

    if current_user.role == 3:
        if student.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Вы можете просматривать только свои данные"
            )

    data = StudentRead.model_validate(student)

    if student.user:
        data.full_name = student.user.full_name

    if student.group_students:
        first_group = student.group_students[0]
        if first_group.group:
            group = first_group.group
            data.group_name = group.name
            
            if group.specialty_id:
                specialty = db.query(Specialty).filter(
                    Specialty.id == group.specialty_id
                ).first()
                if specialty:
                    data.specialty_name = specialty.name
            
            if group.curator and group.curator.user:
                data.curator_name = group.curator.user.full_name

    if student.gender:
        data.gender = student.gender.upper()

    family = db.query(FamilyMember).filter(FamilyMember.student_id == student_id).all()
    data.family_members = [FamilyMemberRead.model_validate(m) for m in family]

    return data


@router.post("/", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать нового студента (только для администратора)."""
    if current_user.role != 1:
        raise HTTPException(
            status_code=403,
            detail="Только администратор может создавать студентов"
        )

    user = db.query(User).filter(User.id == student_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    existing = db.query(Student).filter(
        Student.personal_number == student_in.personal_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Поименный номер уже используется"
        )

    new_student = Student(**student_in.dict())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    data = StudentRead.model_validate(new_student)
    if new_student.user:
        data.full_name = new_student.user.full_name
    if new_student.gender:
        data.gender = new_student.gender.upper()

    return data


@router.put("/{student_id}", response_model=StudentRead)
def update_student(
    student_id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить данные студента (с проверкой прав)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    if current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if curator:
            curator_group_ids = [g.id for g in curator.groups]
            is_in_group = any(
                gs.group_id in curator_group_ids 
                for gs in student.group_students
            )
            if not is_in_group:
                raise HTTPException(
                    status_code=403,
                    detail="У вас нет доступа к этому студенту"
                )

    if student_in.personal_number is not None:
        existing = db.query(Student).filter(
            Student.personal_number == student_in.personal_number,
            Student.id != student_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Поименный номер уже используется другим студентом"
            )

    # 🟢 ИСПРАВЛЕНО: dict вместо model_dump (Pydantic v1)
    data = student_in.dict(exclude={'family_members'}, exclude_none=False)
    
    print(f"🔍 data keys: {list(data.keys())}")
    print(f"🔍 inn from data: {data.get('inn')}")
    print(f"🔍 snils from data: {data.get('snils')}")
    print(f"🔍 medical_policy from data: {data.get('medical_policy')}")
    
    flat_fields = [
        'birth_date', 'citizenship', 'gender', 'email', 'phone',
        'social_status_id', 'health_group_id', 'is_disabled', 'disability_group',
        'notes', 'is_active', 'is_graduated',
        'inn', 'snils', 'medical_policy'
    ]
    
    for field in flat_fields:
        if field in data and data[field] is not None:
            setattr(student, field, data[field])
            print(f"  ✅ setattr student.{field} = {data[field]}")
    
    if data.get('passport'):
        passport = data['passport']
        if passport.get('series') is not None:
            student.passport_series = passport['series']
        if passport.get('number') is not None:
            student.passport_number = passport['number']
        if passport.get('issue_date') is not None:
            student.passport_issue_date = passport['issue_date']
        if passport.get('issued_by') is not None:
            student.passport_issued_by = passport['issued_by']
        if passport.get('department_code') is not None:
            student.passport_department_code = passport['department_code']
    
    if data.get('registration_address'):
        addr = data['registration_address']
        if addr.get('region') is not None:
            student.registration_region = addr['region']
        if addr.get('city') is not None:
            student.registration_city = addr['city']
        if addr.get('street') is not None:
            student.registration_street = addr['street']
        if addr.get('house') is not None:
            student.registration_house = addr['house']
        if addr.get('apartment') is not None:
            student.registration_apartment = addr['apartment']
        if addr.get('zip_code') is not None:
            student.registration_zip = addr['zip_code']
    
    if data.get('actual_address'):
        addr = data['actual_address']
        if addr.get('region') is not None:
            student.actual_region = addr['region']
        if addr.get('city') is not None:
            student.actual_city = addr['city']
        if addr.get('street') is not None:
            student.actual_street = addr['street']
        if addr.get('house') is not None:
            student.actual_house = addr['house']
        if addr.get('apartment') is not None:
            student.actual_apartment = addr['apartment']
        if addr.get('zip_code') is not None:
            student.actual_zip = addr['zip_code']

    if student_in.family_members is not None:
        db.query(FamilyMember).filter(FamilyMember.student_id == student_id).delete()
        
        for member_data in student_in.family_members:
            # 🟢 ИСПРАВЛЕНО: dict вместо model_dump (Pydantic v1)
            member_dict = member_data if isinstance(member_data, dict) else member_data.dict()
            member_dict.pop('id', None)
            
            new_member = FamilyMember(
                student_id=student_id,
                full_name=member_dict.get('full_name', ''),
                relationship_type=member_dict.get('relationship', member_dict.get('relationship_type', '')),
                birth_date=member_dict.get('birth_date'),
                work_place=member_dict.get('work_place'),
                phone=member_dict.get('phone')
            )
            db.add(new_member)
            print(f"👨‍👩‍👧 Добавлен член семьи: {new_member.full_name} ({new_member.relationship_type})")

    print(f"🔍 student.inn BEFORE commit: {student.inn}")
    print(f"🔍 student.snils BEFORE commit: {student.snils}")
    
    db.commit()
    db.refresh(student)
    
    print(f"🔍 student.inn AFTER commit: {student.inn}")
    print(f"🔍 student.snils AFTER commit: {student.snils}")

    data = StudentRead.model_validate(student)
    if student.user:
        data.full_name = student.user.full_name
    if student.gender:
        data.gender = student.gender.upper()

    family = db.query(FamilyMember).filter(FamilyMember.student_id == student_id).all()
    data.family_members = [FamilyMemberRead.model_validate(m) for m in family]

    return data


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить студента (только для администратора)."""
    if current_user.role != 1:
        raise HTTPException(
            status_code=403,
            detail="Только администратор может удалять студентов"
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    db.delete(student)
    db.commit()
    return None


@router.post("/{student_id}/photo")
async def upload_student_photo(
    student_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Загрузка/обновление фото студента.
    Файл сохраняется как: uploads/photos/{personal_number}.{ext}
    Старое фото (с любым расширением) удаляется.
    """
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if photo.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Разрешены только изображения (JPEG, PNG, GIF, WEBP)")
    
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    
    ext_map = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp'
    }
    file_extension = ext_map.get(photo.content_type, '.jpg')
    
    personal_number = student.personal_number
    new_filename = f"{personal_number}{file_extension}"
    new_filepath = os.path.join(PHOTOS_DIR, new_filename)
    
    for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        old_filepath = os.path.join(PHOTOS_DIR, f"{personal_number}{ext}")
        if os.path.exists(old_filepath):
            os.remove(old_filepath)
            print(f"🗑️ Удалено старое фото: {old_filepath}")
    
    with open(new_filepath, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    
    photo_url = f"/uploads/photos/{new_filename}"
    student.photo = photo_url
    db.commit()
    db.refresh(student)
    
    print(f"✅ Фото сохранено: {new_filepath}")
    print(f"📝 БД обновлена: {photo_url}")
    
    return {
        "photo_url": photo_url,
        "filename": new_filename,
        "message": "Фото успешно загружено"
    }