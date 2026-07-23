from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.database import get_db
from app.api.dependencies import get_current_admin
from app.models import User
from app.schemas import UserCreate, UserUpdate, UserRead
from app.core.security import get_password_hash
from app.services.user_service import generate_credentials_pdf

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserRead])
def list_users(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_admin)
):
    return db.query(User).all()


@router.post("/", response_model=UserRead, status_code=201)
def create_user(
        user_data: UserCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_admin)
):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(
        **user_data.model_dump(exclude={"password"}),
        password_hash=get_password_hash(user_data.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
        user_id: int,
        user_data: UserUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return None


@router.get("/{user_id}/credentials", response_class=FileResponse)
def download_credentials(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_admin)
):
    """
    Сгенерировать и скачать PDF-карточку с логином и паролем пользователя.
    Доступно только для администратора.
    """
    # Проверяем, что пользователь существует
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Генерируем PDF
    file_path = generate_credentials_pdf(db, user_id)

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"credentials_{user.full_name.replace(' ', '_')}.pdf"
    )