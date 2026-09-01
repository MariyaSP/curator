# backend/app/api/v1/events.py
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast
from sqlalchemy.dialects.postgresql import JSONB
from typing import List, Optional
from datetime import date, datetime
from calendar import monthrange

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Event, EventCategory, User, Curator, Student, GroupStudent, EventParticipant, Group, EventCompletion
from app.schemas import EventCreate, EventUpdate, EventRead, EventCategoryRead
from app.services.event_service import (
    get_events,
    get_event_by_id,
    create_event,
    delete_event
)

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/categories", response_model=List[EventCategoryRead])
def get_event_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    categories = db.query(EventCategory).filter(
        EventCategory.is_active == True,
        EventCategory.college_id == current_user.college_id
    ).all()
    
    if current_user.role == 1:
        return [c for c in categories if c.name not in ['Дни рождения', 'Личные заметки']]
    
    if current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if curator and curator.groups:
            group_types = set()
            for g in curator.groups:
                if g.group_type:
                    group_types.add(g.group_type)
            
            filtered = []
            for cat in categories:
                if cat.name == 'События куратора Б' and 'budget' not in group_types:
                    continue
                if cat.name == 'События куратора П' and 'paid' not in group_types:
                    continue
                filtered.append(cat)
            return filtered
        else:
            return [c for c in categories if c.name not in ['События куратора Б', 'События куратора П']]
    
    if current_user.role == 3:
        return [c for c in categories if c.name not in ['События куратора Б', 'События куратора П']]
    
    return categories


@router.get("/", response_model=List[EventRead])
def get_all_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    curator_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"🔍 get_all_events: role={current_user.role}, user_id={current_user.id}, month={month}, year={year}")
    
    query = db.query(Event).filter(Event.college_id == current_user.college_id)
    admin_user_ids = [u[0] for u in db.query(User.id).filter(User.role == 1, User.college_id == current_user.college_id).all()]
    
    if current_user.role == 1:
        query = query.filter(Event.created_by.in_(admin_user_ids))
        
    elif current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        print(f"🔍 Куратор найден: {curator.id if curator else 'НЕТ'}")
        
        if curator:
            curator_group_ids = [g.id for g in curator.groups]
            curator_group_types = set(g.group_type for g in curator.groups if g.group_type)
            print(f"🔍 Группы куратора: {curator_group_ids}")
            print(f"🔍 Типы групп: {curator_group_types}")
            
            conditions = [
                Event.created_by == current_user.id,
                Event.curator_id == curator.id,
            ]
            
            conditions.append(Event.visibility.cast(JSONB).contains(['all']))
            conditions.append(Event.visibility.cast(JSONB).contains(['all_teachers']))
            conditions.append(Event.visibility.cast(JSONB).contains(['all_curators']))
            
            if 'budget' in curator_group_types:
                conditions.append(Event.visibility.cast(JSONB).contains(['budget_curators']))
            if 'paid' in curator_group_types:
                conditions.append(Event.visibility.cast(JSONB).contains(['paid_curators']))
            
            conditions.append(
                Event.id.in_(
                    db.query(EventParticipant.event_id).filter(
                        EventParticipant.group_id.in_(curator_group_ids)
                    )
                )
            )
            
            query = query.filter(or_(*conditions))
            print(f"🔍 SQL: {query.statement}")
        else:
            query = query.filter(or_(
                Event.created_by == current_user.id,
                Event.visibility.cast(JSONB).contains(['all']),
                Event.visibility.cast(JSONB).contains(['all_teachers']),
                Event.visibility.cast(JSONB).contains(['all_curators']),
            ))
            print(f"🔍 SQL (без куратора): {query.statement}")
            
    elif current_user.role == 3:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            student_group = db.query(GroupStudent).filter(GroupStudent.student_id == student.id).first()
            student_group_id = student_group.group_id if student_group else None
            student_group_type = None
            
            if student_group_id:
                group = db.query(Group).filter(Group.id == student_group_id).first()
                student_group_type = group.group_type if group else None
            
            conditions = [
                Event.created_by == current_user.id,
                Event.visibility.cast(JSONB).contains(['all']),
            ]
            
            if student_group_type == 'budget':
                conditions.append(Event.visibility.cast(JSONB).contains(['budget_students']))
            elif student_group_type == 'paid':
                conditions.append(Event.visibility.cast(JSONB).contains(['paid_students']))
            
            if student_group_id:
                conditions.append(
                    Event.id.in_(
                        db.query(EventParticipant.event_id).filter(
                            EventParticipant.group_id == student_group_id
                        )
                    )
                )
            
            query = query.filter(or_(*conditions))
        else:
            query = query.filter(or_(
                Event.created_by == current_user.id,
                Event.visibility.cast(JSONB).contains(['all']),
            ))
    
    if curator_id:
        query = query.filter(Event.curator_id == curator_id)
    
    if month and year:
        _, last_day = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)
        query = query.filter(Event.event_date >= start_date, Event.event_date <= end_date)
    
    events = query.order_by(Event.event_date).offset(skip).limit(limit).all()
    print(f"🔍 Найдено событий: {len(events)}")
    for e in events:
        print(f"   - id={e.id}, title={e.title}, visibility={e.visibility}, date={e.event_date}")
    
    completed_event_ids = set(
        ec.event_id for ec in db.query(EventCompletion.event_id).filter(
            EventCompletion.user_id == current_user.id
        ).all()
    )
    
    result = []
    for e in events:
        data = EventRead.model_validate(e)
        data.category_color = e.category.color if e.category else None
        data.category = e.category.name if e.category else None
        data.is_completed_by_current_user = e.id in completed_event_ids
        result.append(data)
    
    # Генерация birthday-событий
    if month and year and current_user.role != 1:
        students_query = db.query(Student).join(Student.user).filter(
            Student.birth_date.isnot(None),
            Student.college_id == current_user.college_id
        )
        
        if current_user.role == 2:
            curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
            if curator and curator.groups:
                curator_group_ids = [g.id for g in curator.groups]
                students_query = students_query.join(GroupStudent).filter(
                    GroupStudent.group_id.in_(curator_group_ids)
                )
            else:
                students_query = students_query.filter(False)
        elif current_user.role == 3:
            student = db.query(Student).filter(Student.user_id == current_user.id).first()
            student_group_id = student.group_students[0].group_id if student else None
            if student_group_id:
                students_query = students_query.join(GroupStudent).filter(
                    GroupStudent.group_id == student_group_id
                )
            else:
                students_query = students_query.filter(False)
        
        students = students_query.all()
        
        for s in students:
            bd = s.birth_date
            if bd and bd.month == month:
                bd_date = date(year, bd.month, bd.day)
                result.append(EventRead(
                    id=100000 + s.id,
                    college_id=s.college_id,
                    category_id=0,
                    curator_id=0,
                    academic_year_id=s.academic_year_id or 1,
                    title=f"ДР — {s.user.full_name}",
                    description=f"Группа: {s.group_students[0].group.name if s.group_students else '—'}",
                    event_date=bd_date,
                    event_type='OTHER',
                    is_recurring=False,
                    is_completed_by_current_user=False,
                    visibility=['private'],
                    category='birthday',
                    category_color='#5b8cff',
                    created_at=s.created_at or datetime.now(),
                    updated_at=s.updated_at or datetime.now(),
                ))
    
    return result


@router.get("/{event_id}/completion-status")
def get_event_completion_status(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.college_id == current_user.college_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    
    if event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Только автор события может просматривать статистику")
    
    visibility = event.visibility if isinstance(event.visibility, list) else [event.visibility]
    if len(visibility) == 1 and visibility[0] == 'private':
        raise HTTPException(status_code=400, detail="Для личных событий статистика недоступна")
    
    audience_users = []
    seen_user_ids = set()
    
    def add_user(user):
        if user and user.id not in seen_user_ids:
            seen_user_ids.add(user.id)
            audience_users.append(user)
    
    if 'all' in visibility:
        all_users = db.query(User).filter(
            User.college_id == event.college_id,
            User.is_active == True
        ).all()
        for u in all_users:
            add_user(u)
    else:
        curator_visibilities = ['all_teachers', 'all_curators', 'budget_curators', 'paid_curators']
        if any(v in visibility for v in curator_visibilities):
            curators = db.query(Curator).filter(Curator.college_id == event.college_id).all()
            for c in curators:
                user = db.query(User).filter(User.id == c.user_id).first()
                if not user:
                    continue
                
                if 'all_teachers' in visibility or 'all_curators' in visibility:
                    add_user(user)
                elif 'budget_curators' in visibility or 'paid_curators' in visibility:
                    group_types = set(g.group_type for g in c.groups if g.group_type)
                    if 'budget_curators' in visibility and 'budget' in group_types:
                        add_user(user)
                    if 'paid_curators' in visibility and 'paid' in group_types:
                        add_user(user)
        
        student_visibilities = ['all_students', 'budget_students', 'paid_students']
        if any(v in visibility for v in student_visibilities):
            students = db.query(Student).filter(
                Student.college_id == event.college_id,
                Student.is_active == True
            ).all()
            for s in students:
                user = db.query(User).filter(User.id == s.user_id).first()
                if not user:
                    continue
                
                if 'all_students' in visibility:
                    add_user(user)
                else:
                    gs = db.query(GroupStudent).filter(GroupStudent.student_id == s.id).first()
                    if gs:
                        group = db.query(Group).filter(Group.id == gs.group_id).first()
                        if group:
                            if 'budget_students' in visibility and group.group_type == 'budget':
                                add_user(user)
                            if 'paid_students' in visibility and group.group_type == 'paid':
                                add_user(user)
    
    completed_ids = set(
        ec[0] for ec in db.query(EventCompletion.user_id).filter(
            EventCompletion.event_id == event_id
        ).all()
    )
    
    completed = []
    not_completed = []
    
    for u in audience_users:
        user_info = {
            "user_id": u.id,
            "full_name": u.full_name,
            "role": u.role,
            "group_type": None,
        }
        
        if u.role == 2:
            curator = db.query(Curator).filter(Curator.user_id == u.id).first()
            if curator and curator.groups:
                group_types = list(set(g.group_type for g in curator.groups if g.group_type))
                user_info["group_type"] = group_types[0] if group_types else None
        
        if u.role == 3:
            student = db.query(Student).filter(Student.user_id == u.id).first()
            if student:
                gs = db.query(GroupStudent).filter(GroupStudent.student_id == student.id).first()
                if gs:
                    group = db.query(Group).filter(Group.id == gs.group_id).first()
                    if group:
                        user_info["group_type"] = group.group_type
        
        if u.id in completed_ids:
            completed.append(user_info)
        else:
            not_completed.append(user_info)
    
    return {
        "event_id": event.id,
        "event_title": event.title,
        "event_date": str(event.event_date),
        "total_audience": len(audience_users),
        "completed_count": len(completed),
        "not_completed_count": len(not_completed),
        "completed": completed,
        "not_completed": not_completed,
    }


@router.get("/{event_id}", response_model=EventRead)
def get_event_by_id_endpoint(event_id: int, db: Session = Depends(get_db)):
    event = get_event_by_id(db, event_id)
    data = EventRead.model_validate(event)
    data.category_color = event.category.color if event.category else None
    return data


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_new_event(
    event_in: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = event_in.dict()
    data['created_by'] = current_user.id
    data['college_id'] = current_user.college_id
    
    if current_user.role == 1:
        data['academic_year_id'] = 1
        data['curator_id'] = None
        
        allowed_visibilities = ['all', 'all_teachers', 'budget_curators', 'paid_curators', 'budget_students', 'paid_students']
        visibility_list = data.get('visibility', [])
        if not visibility_list:
            raise HTTPException(status_code=400, detail="Выберите хотя бы одну аудиторию")
        for v in visibility_list:
            if v not in allowed_visibilities:
                raise HTTPException(status_code=400, detail=f"Недопустимая видимость: {v}")
            
    elif current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if not curator:
            raise HTTPException(status_code=404, detail="Куратор не найден")
        data['curator_id'] = curator.id
        data['academic_year_id'] = 1
        
        if data.get('visibility') == ['groups']:
            data['group_ids'] = [g.id for g in curator.groups]
            
    elif current_user.role == 3:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Студент не найден")
        data['academic_year_id'] = student.academic_year_id or 1
        data['visibility'] = ['private']
    
    event = create_event(db, data)
    result = EventRead.model_validate(event)
    result.category_color = event.category.color if event.category else None
    result.is_completed_by_current_user = False
    return result


@router.post("/{event_id}/complete", status_code=status.HTTP_200_OK)
def complete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.college_id == current_user.college_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    
    existing = db.query(EventCompletion).filter(
        EventCompletion.event_id == event_id,
        EventCompletion.user_id == current_user.id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "uncompleted"}
    else:
        completion = EventCompletion(event_id=event_id, user_id=current_user.id)
        db.add(completion)
        db.commit()
        return {"status": "completed"}


@router.put("/{event_id}", response_model=EventRead)
def update_existing_event(
    event_id: int,
    event_in: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    
    update_data = event_in.dict(exclude_unset=True)
    
    new_is_recurring = update_data.get('is_recurring', event.is_recurring)
    new_recurrence_type = update_data.get('recurrence_type', event.recurrence_type)
    new_recurrence_end_date = update_data.get('recurrence_end_date', event.recurrence_end_date)
    
    if new_recurrence_type and hasattr(new_recurrence_type, 'value'):
        recurrence_type_str = new_recurrence_type.value
    else:
        recurrence_type_str = str(new_recurrence_type) if new_recurrence_type else None
    
    if new_is_recurring and recurrence_type_str and new_recurrence_end_date:
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
        
        db.query(EventParticipant).filter(EventParticipant.event_id == event_id).delete(synchronize_session=False)
        db.query(EventCompletion).filter(EventCompletion.event_id == event_id).delete(synchronize_session=False)
        db.query(Event).filter(Event.parent_event_id == event_id).delete(synchronize_session=False)
        db.query(Event).filter(Event.id == event_id).delete(synchronize_session=False)
        db.commit()
        
        new_event = create_event(db, new_data)
        result = EventRead.model_validate(new_event)
        result.category_color = new_event.category.color if new_event.category else None
        result.is_completed_by_current_user = False
        return result
    
    old_visibility = event.visibility if isinstance(event.visibility, list) else [event.visibility]
    new_visibility = update_data.get('visibility', old_visibility)
    if isinstance(new_visibility, str):
        new_visibility = [new_visibility]
    
    if old_visibility != new_visibility:
        db.query(EventCompletion).filter(EventCompletion.event_id == event_id).delete(synchronize_session=False)
    
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    
    data = EventRead.model_validate(event)
    data.category_color = event.category.color if event.category else None
    return data


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_event(db, event_id)
    return None