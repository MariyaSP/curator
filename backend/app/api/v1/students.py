from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Student, Curator, GroupStudent
from app.schemas import StudentCreate, StudentUpdate, StudentRead

router = APIRouter(prefix="/students", tags=["Students"])


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

    # ===== ФИЛЬТР ДЛЯ КУРАТОРА =====
    if current_user.role == 2:  # Куратор
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if curator and curator.groups:
            # Получаем ID групп куратора
            curator_group_ids = [g.id for g in curator.groups]
            # Фильтруем студентов через таблицу group_students
            query = query.join(GroupStudent).filter(
                GroupStudent.group_id.in_(curator_group_ids)
            )
        else:
            # Если у куратора нет групп — возвращаем пустой список
            return []
    # =================================

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
                data.group_name = first_group.group.name

        if s.gender:
            data.gender = s.gender.upper()
        if s.photo:
            data.photo = s.photo

        result.append(data)

    return result


# Остальные эндпоинты
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

    # Проверка прав для куратора
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

    data = StudentRead.model_validate(student)

    if student.user:
        data.full_name = student.user.full_name

    if student.group_students:
        first_group = student.group_students[0]
        if first_group.group:
            data.group_name = first_group.group.name

    if student.gender:
        data.gender = student.gender.upper()

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

    new_student = Student(**student_in.model_dump())
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

    # Проверка прав для куратора
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

    update_data = student_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)

    data = StudentRead.model_validate(student)
    if student.user:
        data.full_name = student.user.full_name
    if student.gender:
        data.gender = student.gender.upper()

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