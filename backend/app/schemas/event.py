# backend/app/schemas/event.py

from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime, time
from typing import Optional
from .enums import EventType, RecurrenceType

class EventCategoryRead(BaseModel):
    id: int
    name: str
    color: str

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    college_id: int
    category_id: int
    curator_id: int
    academic_year_id: int
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
    is_completed: Optional[bool] = None

class EventRead(BaseModel):
    id: int
    college_id: int
    category_id: int
    curator_id: int
    academic_year_id: int
    title: str
    description: Optional[str] = None
    event_date: date
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    event_type: str
    is_recurring: bool
    recurrence_type: Optional[str] = None
    recurrence_end_date: Optional[date] = None
    location: Optional[str] = None
    is_completed: bool
    category: Optional[str] = None          # 🟢 ДОБАВЛЕНО
    category_color: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('event_type', mode='before')
    @classmethod
    def convert_enum_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v

    @field_validator('recurrence_type', mode='before')
    @classmethod
    def convert_recurrence_enum(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v