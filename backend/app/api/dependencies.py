from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional
from app.core.database import get_db
from app.core.config import settings
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is blocked")
    return user


async def get_current_admin(
        current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != 1:  # 1 = ADMIN
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_current_curator(
        current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [1, 2]:  # ADMIN или CURATOR
        raise HTTPException(status_code=403, detail="Curator access required")
    return current_user