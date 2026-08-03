# backend/app/schemas/student.py

from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Optional, List  
from app.models.enums import Gender
from app.models import DocumentType
from app.models.enums import Gender, AchievementType

class CompetitionParticipantRead(BaseModel):
    id: int
    competition_id: int
    student_id: Optional[int] = None  
    competition_title: Optional[str] = None
    competition_date: Optional[date] = None
    curator_name: Optional[str] = None
    result_type: Optional[str] = None
    result_description: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    created_at: Optional[datetime] = None  

    class Config:
        from_attributes = True

class AddressRead(BaseModel):
    region: Optional[str] = None
    city: str
    street: Optional[str] = None
    house: Optional[str] = None
    apartment: Optional[str] = None
    zip_code: Optional[str] = None


class PassportSchema(BaseModel):
    series: Optional[str] = Field(None, pattern=r'^\d{4}$')
    number: Optional[str] = Field(None, pattern=r'^\d{6}$')
    issue_date: Optional[date] = None
    issued_by: Optional[str] = Field(None, max_length=255)
    department_code: Optional[str] = Field(None, pattern=r'^\d{3}-\d{3}$')


class StudentBase(BaseModel):
    user_id: int
    college_id: int
    academic_year_id: int
    personal_number: str = Field(..., pattern=r'^\d{6}$')
    birth_date: date
    citizenship: Optional[str] = Field(None, max_length=100)
    gender: Optional[Gender] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)

    passport: Optional[PassportSchema] = None

    social_status_id: Optional[int] = None
    health_group_id: Optional[int] = None
    is_disabled: bool = False
    disability_group: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class StudentCreate(StudentBase):
    registration_address: AddressRead
    actual_address: AddressRead


class FamilyMemberCreate(BaseModel):
    full_name: str
    relationship: Optional[str] = None
    relationship_type: Optional[str] = None
    birth_date: Optional[str] = None
    work_place: Optional[str] = None
    phone: Optional[str] = None 


class FamilyMemberRead(BaseModel):
    id: int
    full_name: str
    relationship_type: Optional[str] = None
    birth_date: Optional[date] = None
    work_place: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


# 🟢 Документы — ОБЪЯВЛЕНЫ ДО StudentRead
class DocumentRead(BaseModel):
    id: int
    title: str
    file_path: str
    file_type: str
    document_type_id: Optional[int] = None  # 🟢 Добавлено
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    id: int
    title: str
    file_path: str
    file_type: str
    document_type_id: Optional[int] = None  # 🟢 Добавлено
    uploaded_at: Optional[datetime] = None
    message: str

    class Config:
        from_attributes = True

    
class StudentUpdate(BaseModel):
    user_id: Optional[int] = None
    college_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    personal_number: Optional[str] = Field(None, pattern=r'^\d{6}$')
    birth_date: Optional[date] = None
    citizenship: Optional[str] = Field(None, max_length=100)
    gender: Optional[Gender] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    passport: Optional[PassportSchema] = None
    registration_address: Optional[AddressRead] = None
    actual_address: Optional[AddressRead] = None
    social_status_id: Optional[int] = None
    health_group_id: Optional[int] = None
    is_disabled: Optional[bool] = None
    disability_group: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    is_graduated: Optional[bool] = None
    family_members: Optional[List[FamilyMemberCreate]] = None
    inn: Optional[str] = None
    snils: Optional[str] = None
    medical_policy: Optional[str] = None
    

class DocumentTypeRead(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True

class AchievementCreate(BaseModel):
    title: str
    description: Optional[str] = None
    achievement_date: date
    achievement_type: AchievementType


class AchievementRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    achievement_date: date
    achievement_type: str
    file_path: Optional[str] = None
    file_type: Optional[str] = None

    class Config:
        from_attributes = True


class StudentRead(BaseModel):
    id: int
    user_id: int
    college_id: int
    academic_year_id: int
    personal_number: str
    birth_date: date
    citizenship: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    photo: Optional[str] = None
    is_active: bool
    is_graduated: bool
    graduation_date: Optional[datetime] = None
    specialty_name: Optional[str] = None
    curator_name: Optional[str] = None

    passport_series: Optional[str] = None
    passport_number: Optional[str] = None
    passport_issue_date: Optional[date] = None
    passport_issued_by: Optional[str] = None
    passport_department_code: Optional[str] = None

    registration_region: Optional[str] = None
    registration_city: str
    registration_street: Optional[str] = None
    registration_house: Optional[str] = None
    registration_apartment: Optional[str] = None
    registration_zip: Optional[str] = None

    actual_region: Optional[str] = None
    actual_city: str
    actual_street: Optional[str] = None
    actual_house: Optional[str] = None
    actual_apartment: Optional[str] = None
    actual_zip: Optional[str] = None

    social_status_id: Optional[int] = None
    health_group_id: Optional[int] = None
    is_disabled: bool = False
    disability_group: Optional[str] = None
    notes: Optional[str] = None

    inn: Optional[str] = None
    snils: Optional[str] = None
    medical_policy: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    full_name: Optional[str] = None
    group_name: Optional[str] = None

    family_members: Optional[List[FamilyMemberRead]] = None
    documents: Optional[List[DocumentRead]] = None
    
    achievements: Optional[List[AchievementRead]] = None
    
    competitions: Optional[List[CompetitionParticipantRead]] = None


    class Config:
        from_attributes = True

        
class SocialStatusRead(BaseModel):
    id: int
    code: str
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class HealthGroupRead(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True

