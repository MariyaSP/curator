from pydantic import BaseModel, Field
from typing import Optional


class SpecialtyBase(BaseModel):
    college_id: int
    code: str = Field(..., min_length=1, max_length=15)
    name: str = Field(..., min_length=1, max_length=200)


class SpecialtyCreate(SpecialtyBase):
    pass


class SpecialtyUpdate(BaseModel):
    college_id: Optional[int] = None
    code: Optional[str] = Field(None, min_length=1, max_length=15)
    name: Optional[str] = Field(None, min_length=1, max_length=200)


class SpecialtyRead(SpecialtyBase):
    id: int

    class Config:
        from_attributes = True