# backend/app/schemas/event.py
from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime, time
from typing import Optional, List, Union
from .enums import EventType, RecurrenceType

class EventCategoryRead(BaseModel):
    id: int
    college_id: Optional[int] = None
    name: str
    color: str
    is_active: Optional[bool] = True
    audience: Optional[str] = 'all'

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    college_id: Optional[int] = None
    category_id: int
    curator_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    created_by: Optional[int] = None
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    event_date: date
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    event_type: EventType
    is_recurring: bool = False
    recurrence_type: Optional[RecurrenceType] = None
    recurrence_end_date: Optional[date] = None
    location: Optional[str] = Field(None, max_length=200)
    visibility: Optional[List[str]] = ['private']

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    category_id: Optional[int] = None
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    event_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    event_type: Optional[EventType] = None
    is_recurring: Optional[bool] = None
    recurrence_type: Optional[RecurrenceType] = None
    recurrence_end_date: Optional[date] = None
    location: Optional[str] = Field(None, max_length=200)
    visibility: Optional[List[str]] = None

class EventRead(BaseModel):
    id: int
    college_id: int
    category_id: int
    curator_id: Optional[int] = None
    academic_year_id: int
    created_by: Optional[int] = None
    title: str
    description: Optional[str] = None
    event_date: date
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    event_type: str
    is_recurring: bool = False
    recurrence_type: Optional[str] = None  # ← Оставляем str
    recurrence_end_date: Optional[date] = None
    location: Optional[str] = None
    visibility: Optional[List[str]] = None
    is_completed_by_current_user: Optional[bool] = False
    category: Optional[str] = None
    category_color: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('event_type', mode='before')
    @classmethod
    def convert_enum_to_str(cls, v):
        if v is None:
            return None
        if hasattr(v, 'value'):
            return v.value
        return str(v) if v else None

    @field_validator('recurrence_type', mode='before')
    @classmethod
    def convert_recurrence_enum(cls, v):
        if v is None:
            return None
        if hasattr(v, 'value'):
            return v.value
        if isinstance(v, str):
            return v
        return str(v) if v else None

    @field_validator('category', mode='before')
    @classmethod
    def convert_category(cls, v):
        if v is None:
            return None
        if hasattr(v, 'name'):
            return v.name
        return str(v) if v else None

    @field_validator('visibility', mode='before')
    @classmethod
    def convert_visibility(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        if isinstance(v, list):
            return v
        return []