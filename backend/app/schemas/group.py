from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class GroupBase(BaseModel):
    college_id: int
    curator_id: int
    name: str = Field(..., max_length=50)
    start_year: int = Field(..., ge=2000, le=2100)
    end_year: int = Field(..., ge=2000, le=2100)
    specialization: Optional[str] = Field(None, max_length=100)
    group_type: Optional[str] = 'budget'

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    college_id: Optional[int] = None
    curator_id: Optional[int] = None
    name: Optional[str] = Field(None, max_length=50)
    start_year: Optional[int] = Field(None, ge=2000, le=2100)
    end_year: Optional[int] = Field(None, ge=2000, le=2100)
    specialization: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class GroupRead(GroupBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    student_count: Optional[int] = None

    class Config:
        from_attributes = True

class SpecialtyRead(BaseModel):
    id: int
    name: str
    code: str
    is_active: Optional[bool] = True
    class Config: from_attributes = True