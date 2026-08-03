# backend/app/api/v1/students.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, date
from app.models import Competition

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Student, Curator, GroupStudent, Group, Specialty, FamilyMember, SocialStatus, HealthGroup, StudentDocument, DocumentType, StudentAchievement
from app.schemas import StudentCreate, StudentUpdate, StudentRead, DocumentRead, DocumentUploadResponse
from app.schemas import SocialStatusRead, HealthGroupRead
from app.schemas import FamilyMemberRead, DocumentTypeRead
from app.schemas import AchievementCreate, AchievementRead
from app.models import CompetitionParticipant
from app.schemas import CompetitionParticipantRead
from sqlalchemy.orm import joinedload

from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
import zipfile
import os
import shutil
from io import BytesIO


router = APIRouter(prefix="/students", tags=["Students"])
PHOTOS_DIR = "uploads/photos"
DOCUMENTS_DIR = "uploads/documents"
ACHIEVEMENTS_DIR = "uploads/achievements"
COMPETITIONS_DIR = "uploads/competitions"


@router.get("/", response_model=List[StudentRead])
def get_all_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(15, ge=1, le=100),
    group_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    statuses = db.query(SocialStatus).filter(SocialStatus.is_active == True).all()
    return statuses


@router.get("/references/health-groups", response_model=List[HealthGroupRead])
def get_health_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    groups = db.query(HealthGroup).all()
    return groups


@router.get("/references/document-types", response_model=List[DocumentTypeRead])
def get_document_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    types = db.query(DocumentType).all()
    return types


@router.get("/references/curators")
def get_college_curators(
    search: Optional[str] = Query(None, description="Поиск по ФИО"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список преподавателей колледжа текущего пользователя."""
    if current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        college_id = curator.college_id if curator else None
    else:
        college_id = None
    
    query = db.query(Curator).join(User)
    
    if college_id:
        query = query.filter(Curator.college_id == college_id)
    
    if search:
        query = query.filter(User.full_name.ilike(f"%{search}%"))
    
    curators = query.limit(20).all()
    
    return [
        {
            "id": c.id,
            "full_name": c.user.full_name,
            "college_id": c.college_id,
        }
        for c in curators
    ]


@router.get("/{student_id}", response_model=StudentRead)
def get_student_by_id(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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

    docs = db.query(StudentDocument).filter(StudentDocument.student_id == student_id).all()
    data.documents = [DocumentRead.model_validate(d) for d in docs]
    
    achievements = db.query(StudentAchievement).filter(
        StudentAchievement.student_id == student_id
    ).order_by(StudentAchievement.achievement_date.desc()).all()
    data.achievements = [AchievementRead.model_validate(a) for a in achievements]
    
    # 🟢 ИСПРАВЛЕНО: Загружаем участия в конкурсах — все поля передаются при создании
# Загружаем участия в конкурсах
    participants = db.query(CompetitionParticipant).options(
        joinedload(CompetitionParticipant.competition)
    ).filter(
        CompetitionParticipant.student_id == student_id
    ).all()

    data.competitions = []
    for p in participants:
        # Явно загружаем competition
        competition = db.query(Competition).filter(Competition.id == p.competition_id).first()
        
        title = None
        comp_date = None
        curator_name = None
        if competition:
            title = competition.title
            comp_date = competition.competition_date
        if p.curator and p.curator.user:
            curator_name = p.curator.user.full_name
        
        comp_data = CompetitionParticipantRead(
            id=p.id,
            student_id=p.student_id,
            competition_id=p.competition_id,
            competition_title=title,
            competition_date=comp_date,
            curator_name=curator_name,
            result_type=p.result_type.value.upper() if p.result_type else None,
            file_path=p.file_path,
            file_type=p.file_type.value if p.file_type else None,
            created_at=p.created_at,
        )
        data.competitions.append(comp_data)

    return data


@router.post("/", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Только администратор может создавать студентов")

    user = db.query(User).filter(User.id == student_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    existing = db.query(Student).filter(
        Student.personal_number == student_in.personal_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Поименный номер уже используется")

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
                raise HTTPException(status_code=403, detail="У вас нет доступа к этому студенту")

    if student_in.personal_number is not None:
        existing = db.query(Student).filter(
            Student.personal_number == student_in.personal_number,
            Student.id != student_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Поименный номер уже используется другим студентом")

    data = student_in.dict(exclude={'family_members'}, exclude_none=False)
    
    flat_fields = [
        'birth_date', 'citizenship', 'gender', 'email', 'phone',
        'social_status_id', 'health_group_id', 'is_disabled', 'disability_group',
        'notes', 'is_active', 'is_graduated',
        'inn', 'snils', 'medical_policy'
    ]
    
    for field in flat_fields:
        if field in data and data[field] is not None:
            setattr(student, field, data[field])
    
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

    db.commit()
    db.refresh(student)

    data = StudentRead.model_validate(student)
    if student.user:
        data.full_name = student.user.full_name
    if student.gender:
        data.gender = student.gender.upper()

    family = db.query(FamilyMember).filter(FamilyMember.student_id == student_id).all()
    data.family_members = [FamilyMemberRead.model_validate(m) for m in family]

    docs = db.query(StudentDocument).filter(StudentDocument.student_id == student_id).all()
    data.documents = [DocumentRead.model_validate(d) for d in docs]

    # 🟢 ДОБАВЛЕНО: возвращаем достижения
    achievements = db.query(StudentAchievement).filter(
        StudentAchievement.student_id == student_id
    ).order_by(StudentAchievement.achievement_date.desc()).all()
    data.achievements = [AchievementRead.model_validate(a) for a in achievements]

    # 🟢 ДОБАВЛЕНО: возвращаем конкурсы
    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.student_id == student_id
    ).all()
    data.competitions = []
    for p in participants:
        title = None
        comp_date = None
        curator_name = None
        if p.competition:
            title = p.competition.title
            comp_date = p.competition.competition_date
        if p.curator and p.curator.user:
            curator_name = p.curator.user.full_name
        
        data.competitions.append(CompetitionParticipantRead(
            id=p.id,
            student_id=p.student_id,
            competition_id=p.competition_id,
            competition_title=title,
            competition_date=comp_date,
            curator_name=curator_name,
            result_type=p.result_type.value.upper() if p.result_type else None,
            file_path=p.file_path,
            file_type=p.file_type.value if p.file_type else None,
            created_at=p.created_at,
        ))

    return data


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Только администратор может удалять студентов")

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
    
    with open(new_filepath, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    
    photo_url = f"/uploads/photos/{new_filename}"
    student.photo = photo_url
    db.commit()
    db.refresh(student)
    
    return {
        "photo_url": photo_url,
        "filename": new_filename,
        "message": "Фото успешно загружено"
    }


# ========== ДОКУМЕНТЫ ==========

@router.post("/{student_id}/documents", response_model=DocumentUploadResponse)
async def upload_document(
    student_id: int,
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Разрешены только PDF, JPG, JPEG, PNG")

    ext_map = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/png': '.png'
    }
    ext = ext_map.get(file.content_type, '.jpg')
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    filename = f"{student.personal_number}_{safe_title}{ext}"
    
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    file_path = os.path.join(DOCUMENTS_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc = StudentDocument(
        student_id=student_id,
        title=title,
        file_path=f"/uploads/documents/{filename}",
        file_type=ext.replace('.', ''),
        uploaded_at=datetime.now(timezone.utc)
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    return DocumentUploadResponse(
        id=doc.id,
        title=doc.title,
        file_path=doc.file_path,
        file_type=doc.file_type,
        uploaded_at=doc.uploaded_at,
        message="Документ успешно загружен"
    )


@router.get("/{student_id}/documents", response_model=List[DocumentRead])
def get_student_documents(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docs = db.query(StudentDocument).filter(StudentDocument.student_id == student_id).all()
    return docs


@router.get("/{student_id}/documents/{doc_id}/view")
def view_document(
    student_id: int,
    doc_id: int,
    db: Session = Depends(get_db)
):
    doc = db.query(StudentDocument).filter(
        StudentDocument.id == doc_id,
        StudentDocument.student_id == student_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    file_path = os.path.join(os.getcwd(), DOCUMENTS_DIR, os.path.basename(doc.file_path))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    media_type_map = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png'
    }
    media_type = media_type_map.get(doc.file_type, 'application/octet-stream')
    
    return FileResponse(file_path, media_type=media_type)


@router.get("/{student_id}/documents/{doc_id}/download")
def download_document(
    student_id: int,
    doc_id: int,
    db: Session = Depends(get_db)
):
    doc = db.query(StudentDocument).filter(
        StudentDocument.id == doc_id,
        StudentDocument.student_id == student_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    file_path = os.path.join(os.getcwd(), DOCUMENTS_DIR, os.path.basename(doc.file_path))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    filename = os.path.basename(doc.file_path)
    return FileResponse(file_path, media_type='application/octet-stream', filename=filename)


@router.get("/{student_id}/documents/archive")
def download_all_documents_archive(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    docs = db.query(StudentDocument).filter(StudentDocument.student_id == student_id).all()
    
    if not docs:
        raise HTTPException(status_code=404, detail="Нет документов для скачивания")
    
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for doc in docs:
            file_path = os.path.join(os.getcwd(), DOCUMENTS_DIR, os.path.basename(doc.file_path))
            if os.path.exists(file_path):
                zf.write(file_path, os.path.basename(file_path))
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type='application/zip',
        headers={
            'Content-Disposition': f'attachment; filename="documents_{student.personal_number}.zip"'
        }
    )


@router.delete("/{student_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    student_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(StudentDocument).filter(
        StudentDocument.id == doc_id,
        StudentDocument.student_id == student_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    file_path = os.path.join(os.getcwd(), DOCUMENTS_DIR, os.path.basename(doc.file_path))
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.delete(doc)
    db.commit()
    return None


# ======== ДОСТИЖЕНИЯ =============

@router.get("/{student_id}/achievements", response_model=List[AchievementRead])
def get_student_achievements(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить достижения студента, отсортированные по дате (новые сначала)."""
    achievements = db.query(StudentAchievement).filter(
        StudentAchievement.student_id == student_id
    ).order_by(StudentAchievement.achievement_date.desc()).all()
    return achievements


@router.post("/{student_id}/achievements", response_model=AchievementRead)
async def create_achievement(
    student_id: int,
    title: str = Form(...),
    achievement_date: date = Form(...),
    achievement_type: str = Form(...),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Добавить достижение с опциональным файлом."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    file_path = None
    file_type = None

    if file and file.filename:
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Разрешены только PDF, JPG, PNG")
        
        ext_map = {'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png'}
        ext = ext_map.get(file.content_type, 'jpg')
        
        os.makedirs(ACHIEVEMENTS_DIR, exist_ok=True)
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        filename = f"{student.personal_number}_{safe_title}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.{ext}"
        file_path_full = os.path.join(ACHIEVEMENTS_DIR, filename)
        
        with open(file_path_full, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_path = f"/uploads/achievements/{filename}"
        file_type = ext

    achievement = StudentAchievement(
        student_id=student_id,
        title=title,
        description=description,
        achievement_date=achievement_date,
        achievement_type=achievement_type,
        file_path=file_path,
        file_type=file_type
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    
    return achievement


@router.get("/{student_id}/achievements/{achievement_id}/view")
def view_achievement_file(
    student_id: int,
    achievement_id: int,
    db: Session = Depends(get_db)
):
    """Просмотр файла достижения."""
    achievement = db.query(StudentAchievement).filter(
        StudentAchievement.id == achievement_id,
        StudentAchievement.student_id == student_id
    ).first()
    if not achievement or not achievement.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    file_path = os.path.join(os.getcwd(), ACHIEVEMENTS_DIR, os.path.basename(achievement.file_path))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    media_type_map = {'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}
    media_type = media_type_map.get(achievement.file_type, 'application/octet-stream')
    
    return FileResponse(file_path, media_type=media_type)


@router.delete("/{student_id}/achievements/{achievement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_achievement(
    student_id: int,
    achievement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить достижение."""
    achievement = db.query(StudentAchievement).filter(
        StudentAchievement.id == achievement_id,
        StudentAchievement.student_id == student_id
    ).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    if achievement.file_path:
        file_path = os.path.join(os.getcwd(), ACHIEVEMENTS_DIR, os.path.basename(achievement.file_path))
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.delete(achievement)
    db.commit()
    return None

@router.post("/{student_id}/competitions/{participant_id}/upload")
async def upload_competition_file(
    student_id: int,
    participant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Загрузить файл для участника конкурса."""
    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.id == participant_id,
        CompetitionParticipant.student_id == student_id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Участник не найден")

    allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Разрешены только PDF, JPG, PNG")

    ext_map = {'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png'}
    ext = ext_map.get(file.content_type, 'jpg')

    student = db.query(Student).filter(Student.id == student_id).first()
    safe_comp_title = "".join(c for c in (participant.competition.title or 'contest') if c.isalnum() or c in (' ', '-', '_')).rstrip()[:30]
    filename = f"{student.personal_number}_{participant_id}_{safe_comp_title}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.{ext}"
    
    os.makedirs(COMPETITIONS_DIR, exist_ok=True)
    file_path = os.path.join(COMPETITIONS_DIR, filename)
    
    # Удаляем старый файл если есть
    if participant.file_path:
        old_path = os.path.join(os.getcwd(), COMPETITIONS_DIR, os.path.basename(participant.file_path))
        if os.path.exists(old_path):
            os.remove(old_path)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    participant.file_path = f"/uploads/competitions/{filename}"
    participant.file_type = ext
    participant.file_name = file.filename
    db.commit()
    
    return {"file_path": participant.file_path, "message": "Файл загружен"}

@router.get("/{student_id}/competitions/{participant_id}/view")
def view_competition_file(
    student_id: int,
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Просмотр файла конкурса."""
    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.id == participant_id,
        CompetitionParticipant.student_id == student_id
    ).first()
    if not participant or not participant.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    file_path = os.path.join(os.getcwd(), COMPETITIONS_DIR, os.path.basename(participant.file_path))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    media_type_map = {'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}
    media_type = media_type_map.get(participant.file_type, 'application/octet-stream')
    
    return FileResponse(file_path, media_type=media_type)