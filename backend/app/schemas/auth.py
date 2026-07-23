from pydantic import BaseModel, EmailStr, Field

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: int
    full_name: str
    user_id: int

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)