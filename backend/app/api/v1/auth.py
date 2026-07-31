from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
# 🟢 ДОБАВЛЕНО: импорт get_current_user
from app.core.security import create_access_token, verify_password, get_current_user
from app.models import User
from app.schemas import UserToken
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=UserToken)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный пароль или email"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован"
        )

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return UserToken(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        full_name=user.full_name,
        user_id=user.id
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Возвращает текущего пользователя."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }