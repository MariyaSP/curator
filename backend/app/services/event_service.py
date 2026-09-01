# backend/app/services/event_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import date, timedelta
import calendar
import asyncio

from app.models.event import Event
from app.models.event_category import EventCategory
from app.models.event_participant import EventParticipant
from app.models.event_completion import EventCompletion
from app.core.websocket_manager import manager


def get_events(
        db: Session, skip: int = 0, limit: int = 15,
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


def create_event(db: Session, data: dict) -> Event:
    category = db.query(EventCategory).filter(EventCategory.id == data.get('category_id')).first()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    group_ids = data.pop('group_ids', [])
    data.pop('location', None)
    
    is_recurring = data.get('is_recurring', False)
    recurrence_type = data.get('recurrence_type')
    recurrence_end_date = data.get('recurrence_end_date')
    
    if recurrence_type is None:
        recurrence_type_str = None
    elif hasattr(recurrence_type, 'value'):
        recurrence_type_str = recurrence_type.value
    else:
        recurrence_type_str = str(recurrence_type)

    first_event = Event(**data)
    db.add(first_event)
    db.flush()

    for gid in group_ids:
        participant = EventParticipant(event_id=first_event.id, group_id=gid)
        db.add(participant)

    created_count = 0
    if is_recurring and recurrence_type_str and recurrence_end_date:
        current_date = data['event_date']
        end_date = recurrence_end_date
        
        while True:
            if recurrence_type_str == 'WEEKLY':
                current_date = current_date + timedelta(days=7)
            elif recurrence_type_str == 'MONTHLY':
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
            recurring_data['parent_event_id'] = first_event.id

            recurring_event = Event(**recurring_data)
            db.add(recurring_event)
            db.flush()
            
            for gid in group_ids:
                participant = EventParticipant(event_id=recurring_event.id, group_id=gid)
                db.add(participant)
            
            created_count += 1

    db.commit()
    db.refresh(first_event)
    
    try:
        asyncio.create_task(manager.broadcast({
            "type": "event_created",
            "data": {
                "id": first_event.id,
                "title": first_event.title,
                "event_date": str(first_event.event_date),
                "category_id": first_event.category_id,
            }
        }))
    except Exception:
        pass
    
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
    
    # Проверяем, стало ли событие повторяющимся
    new_is_recurring = update_data.get('is_recurring', event.is_recurring)
    new_recurrence_type = update_data.get('recurrence_type', event.recurrence_type)
    new_recurrence_end_date = update_data.get('recurrence_end_date', event.recurrence_end_date)
    
    if new_recurrence_type and hasattr(new_recurrence_type, 'value'):
        recurrence_type_str = new_recurrence_type.value
    else:
        recurrence_type_str = str(new_recurrence_type) if new_recurrence_type else None
    
    # Если событие стало повторяющимся — удаляем старое и создаем новое
    if new_is_recurring and recurrence_type_str and new_recurrence_end_date:
        print(f"🔍 update_event: Событие {event_id} стало повторяющимся, удаляю и создаю заново")
        
        # Сохраняем данные старого события
        new_data = {
            'college_id': event.college_id,
            'category_id': update_data.get('category_id', event.category_id),
            'curator_id': event.curator_id,
            'academic_year_id': event.academic_year_id,
            'created_by': event.created_by,
            'title': update_data.get('title', event.title),
            'description': update_data.get('description', event.description),
            'event_date': update_data.get('event_date', event.event_date),
            'start_time': update_data.get('start_time', event.start_time),
            'end_time': event.end_time,
            'event_type': event.event_type,
            'is_recurring': new_is_recurring,
            'recurrence_type': new_recurrence_type,
            'recurrence_end_date': new_recurrence_end_date,
            'visibility': update_data.get('visibility', event.visibility),
        }
        
        # Удаляем связанные записи старого события
        db.query(EventParticipant).filter(
            EventParticipant.event_id == event_id
        ).delete(synchronize_session=False)
        
        db.query(EventCompletion).filter(
            EventCompletion.event_id == event_id
        ).delete(synchronize_session=False)
        
        # Удаляем старые повторяющиеся
        db.query(Event).filter(
            Event.parent_event_id == event_id
        ).delete(synchronize_session=False)
        
        # Удаляем само событие
        db.query(Event).filter(Event.id == event_id).delete(synchronize_session=False)
        db.flush()
        
        # Создаем новое событие через create_event
        new_event = create_event(db, new_data)
        
        try:
            asyncio.create_task(manager.broadcast({
                "type": "event_updated",
                "data": {
                    "id": new_event.id,
                    "title": new_event.title,
                    "event_date": str(new_event.event_date),
                }
            }))
        except Exception:
            pass
        
        return new_event
    
    # Если НЕ повторяющееся — просто обновляем поля
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    
    try:
        asyncio.create_task(manager.broadcast({
            "type": "event_updated",
            "data": {
                "id": event.id,
                "title": event.title,
                "event_date": str(event.event_date),
            }
        }))
    except Exception:
        pass
    
    return event


def delete_event(db: Session, event_id: int) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    
    # Удаляем все повторяющиеся
    db.query(Event).filter(
        Event.parent_event_id == event_id
    ).delete(synchronize_session=False)
    db.flush()
    
    # Удаляем связанные записи
    db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id
    ).delete(synchronize_session=False)
    
    db.query(EventCompletion).filter(
        EventCompletion.event_id == event_id
    ).delete(synchronize_session=False)
    
    db.delete(event)
    db.commit()
    
    try:
        asyncio.create_task(manager.broadcast({
            "type": "event_deleted",
            "data": {"id": event_id}
        }))
    except Exception:
        pass