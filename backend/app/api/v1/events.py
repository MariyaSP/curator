from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.schemas import EventCreate, EventUpdate, EventRead
from app.services.event_service import (
    get_events,
    get_event_by_id,
    create_event,
    update_event,
    delete_event
)

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=List[EventRead])
def get_all_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(15, ge=1, le=100),
    curator_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Получить список событий с фильтрацией и пагинацией"""
    events = get_events(db, skip, limit, curator_id, start_date, end_date)
    result = []
    for e in events:
        data = EventRead.model_validate(e)
        data.category_color = e.category.color if e.category else None
        result.append(data)
    return result


@router.get("/{event_id}", response_model=EventRead)
def get_event_by_id_endpoint(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Получить событие по ID"""
    event = get_event_by_id(db, event_id)
    data = EventRead.model_validate(event)
    data.category_color = event.category.color if event.category else None
    return data


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_new_event(
    event_in: EventCreate,
    db: Session = Depends(get_db)
):
    """Создать новое событие"""
    event = create_event(db, event_in)
    data = EventRead.model_validate(event)
    data.category_color = event.category.color if event.category else None
    return data


@router.put("/{event_id}", response_model=EventRead)
def update_existing_event(
    event_id: int,
    event_in: EventUpdate,
    db: Session = Depends(get_db)
):
    """Обновить событие"""
    event = update_event(db, event_id, event_in)
    data = EventRead.model_validate(event)
    data.category_color = event.category.color if event.category else None
    return data


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Удалить событие"""
    delete_event(db, event_id)
    return None