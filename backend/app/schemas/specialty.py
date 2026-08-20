from pydantic import BaseModel
from typing import Optional

class SpecialtyBase(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = True

class SpecialtyCreate(SpecialtyBase):
    code: str
    name: str

class SpecialtyUpdate(SpecialtyBase):
    pass

class SpecialtyRead(SpecialtyBase):
    id: int
    college_id: Optional[int] = None
    
    class Config:
        from_attributes = True