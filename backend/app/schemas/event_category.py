from pydantic import BaseModel
from typing import Optional

class EventCategoryRead(BaseModel):
    id: int
    college_id: Optional[int] = None
    name: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = True
    class Config: from_attributes = True

class EventCategoryCreate(BaseModel):
    name: str
    color: str = "#112336"
    is_active: bool = True

class EventCategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None