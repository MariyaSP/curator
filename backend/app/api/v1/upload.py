from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import os
import shutil
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Student

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = "uploads/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/student/{student_id}/photo")
async def upload_student_photo(
    student_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверяем, что студент существует
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    # Проверяем права (куратор может загружать фото только своих студентов)
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

    # Проверяем тип файла
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Разрешены только JPG, JPEG, PNG"
        )

    # Генерируем имя файла
    ext = file.filename.split(".")[-1]
    filename = f"student_{student_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Обновляем путь в БД
    db_path = f"/{UPLOAD_DIR}/{filename}".replace("\\", "/")
    student.photo = db_path
    db.commit()

    return {"message": "Фото загружено", "path": db_path}