from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=200)
    role: int = Field(..., ge=0, le=3, description="0-супервайзер, 1-админ, 2-куратор, 3-студент")
    college_id: int
    phone: Optional[str] = Field(None, pattern=r'^\+7\(\d{3}\)-\d{3}-\d{2}-\d{2}$', description="+7(945)-456-45-45")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=200)
    role: Optional[int] = Field(None, ge=0, le=3)
    is_active: Optional[bool] = None
    college_id: Optional[int] = None
    phone: Optional[str] = Field(None, pattern=r'^\+7\(\d{3}\)-\d{3}-\d{2}-\d{2}$')

class UserRead(UserBase):
    id: int
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True