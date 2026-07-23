from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional

from app.models import Student, User
from app.schemas import StudentCreate, StudentUpdate


def get_students(
        db: Session,
        skip: int = 0,
        limit: int = 15,
        group_id: Optional[int] = None,
        search: Optional[str] = None
) -> List[Student]:
    query = db.query(Student)

    if group_id:
        query = query.join(Student.group_students).filter(
            Student.group_students.any(group_id=group_id)
        )

    if search:
        query = query.join(User).filter(
            (User.full_name.ilike(f"%{search}%")) |
            (Student.personal_number.ilike(f"%{search}%"))
        )

    return query.offset(skip).limit(limit).all()


def get_student_by_id(db: Session, student_id: int) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    return student


def create_student(db: Session, student_in: StudentCreate) -> Student:
    user = db.query(User).filter(User.id == student_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    existing = db.query(Student).filter(
        Student.personal_number == student_in.personal_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Поименный номер уже используется")

    new_student = Student(**student_in.model_dump())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


def update_student(db: Session, student_id: int, student_in: StudentUpdate) -> Student:
    student = get_student_by_id(db, student_id)

    # Если номер меняется — проверяем уникальность (кроме самого студента)
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
    return student


def delete_student(db: Session, student_id: int) -> None:
    student = get_student_by_id(db, student_id)
    db.delete(student)
    db.commit()


def block_student(db: Session, student_id: int) -> Student:
    student = get_student_by_id(db, student_id)
    student.is_active = False
    db.commit()
    db.refresh(student)
    return student


def unblock_student(db: Session, student_id: int) -> Student:
    student = get_student_by_id(db, student_id)
    student.is_active = True
    db.commit()
    db.refresh(student)
    return student


def graduate_student(db: Session, student_id: int) -> Student:
    student = get_student_by_id(db, student_id)
    student.is_active = False
    student.is_graduated = True
    student.graduation_date = datetime.utcnow()
    db.commit()
    db.refresh(student)
    return student
