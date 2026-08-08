from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import date, timedelta
import calendar

from app.models.event import Event
from app.models.curator import Curator
from app.models.event_category import EventCategory


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

    data = event_in.dict()
    data.pop('location', None)  # 🟢 убираем location для первого события
    
    is_recurring = data.get('is_recurring', False)
    recurrence_type = data.get('recurrence_type')
    recurrence_end_date = data.get('recurrence_end_date')

    first_event = Event(**data)
    db.add(first_event)
    db.flush()

    if is_recurring and recurrence_type and recurrence_end_date:
        current_date = data['event_date']
        end_date = recurrence_end_date

        while True:
            if recurrence_type.value == 'WEEKLY':
                current_date = current_date + timedelta(days=7)
            elif recurrence_type.value == 'MONTHLY':
                month = current_date.month + 1
                year = current_date.year
                if month > 12:
                    month = 1
                    year += 1
                day = data['event_date'].day
                last_day = calendar.monthrange(year, month)[1]
                target_day = min(day, last_day)
                current_date = date(year, month, target_day)
                current_date = _to_workday(current_date)
            else:
                break

            if current_date > end_date:
                break

            recurring_data = data.copy()
            recurring_data['event_date'] = current_date
            recurring_data['is_recurring'] = False
            recurring_data['recurrence_type'] = None
            recurring_data['recurrence_end_date'] = None

            recurring_event = Event(**recurring_data)
            db.add(recurring_event)

    db.commit()
    db.refresh(first_event)
    return first_event


def _to_workday(d: date) -> date:
    if d.weekday() == 5:
        return d - timedelta(days=1)
    if d.weekday() == 6:
        return d - timedelta(days=2)
    return d


def update_event(db: Session, event_id: int, event_in) -> Event:
    event = get_event_by_id(db, event_id)
    update_data = event_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event_id: int) -> None:
    event = get_event_by_id(db, event_id)
    db.delete(event)
    db.commit()