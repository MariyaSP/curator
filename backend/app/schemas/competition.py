from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from .enums import CompetitionFormat, CompetitionScope, CompetitionResultType

# ========== КОНКУРС ==========
class CompetitionBase(BaseModel):
    curator_id: int
    college_id: int
    academic_year_id: int
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    competition_date: date
    format: CompetitionFormat
    scope: CompetitionScope

class CompetitionCreate(CompetitionBase):
    pass

class CompetitionUpdate(BaseModel):
    curator_id: Optional[int] = None
    college_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    competition_date: Optional[date] = None
    format: Optional[CompetitionFormat] = None
    scope: Optional[CompetitionScope] = None

class CompetitionRead(CompetitionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ========== УЧАСТНИК КОНКУРСА ==========
class CompetitionParticipantBase(BaseModel):
    competition_id: int
    student_id: int
    result_type: CompetitionResultType
    result_description: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None

class CompetitionParticipantCreate(CompetitionParticipantBase):
    pass

class CompetitionParticipantRead(CompetitionParticipantBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True