from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import date

from app.models import Event, Curator, EventCategory


def get_events(
        db: Session,
        skip: int = 0,
        limit: int = 15,
        curator_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
) -> List[Event]:
    query = db.query(Event)
    if curator_id:
        query = query.filter(Event.curator_id == curator_id)
    if start_date:
        query = query.filter(Event.event_date >= start_date)
    if end_date:
        query = query.filter(Event.event_date <= end_date)
    return query.offset(skip).limit(limit).all()


def get_event_by_id(db: Session, event_id: int) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    return event


def create_event(db: Session, event_in) -> Event:
    curator = db.query(Curator).filter(Curator.id == event_in.curator_id).first()
    if not curator:
        raise HTTPException(status_code=404, detail="Куратор не найден")

    category = db.query(EventCategory).filter(EventCategory.id == event_in.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    event = Event(**event_in.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def update_event(db: Session, event_id: int, event_in) -> Event:
    event = get_event_by_id(db, event_id)
    update_data = event_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event_id: int) -> None:
    event = get_event_by_id(db, event_id)
    db.delete(event)
    db.commit()