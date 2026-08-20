# backend/app/api/v1/events.py
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from calendar import monthrange

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Event, EventCategory, User, Curator, Student, GroupStudent, EventParticipant
from app.schemas import EventCreate, EventUpdate, EventRead, EventCategoryRead
from app.services.event_service import (
    get_events,
    get_event_by_id,
    create_event,
    update_event,
    delete_event
)

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/categories", response_model=List[EventCategoryRead])
def get_event_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    categories = db.query(EventCategory).filter(EventCategory.is_active == True).all()
    
    # Админ не видит категорию «Дни рождения» и «Личные заметки»
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
        # Студент видит все категории, кроме специфичных для кураторов
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
    from sqlalchemy import or_, and_
    
    query = db.query(Event)
    admin_user_ids = [u[0] for u in db.query(User.id).filter(User.role == 1).all()]
    
    if current_user.role == 1:
        # Админ видит только события, созданные админами
        query = query.filter(Event.created_by.in_(admin_user_ids))
        
    elif current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if curator:
            curator_group_ids = [g.id for g in curator.groups]
            curator_group_types = set(g.group_type for g in curator.groups if g.group_type)
            
            conditions = [
                Event.curator_id == curator.id,
                (Event.created_by.in_(admin_user_ids)) & (Event.visibility == 'all'),
                (Event.created_by.in_(admin_user_ids)) & (Event.visibility == 'all_curators'),
            ]
            
            if 'budget' in curator_group_types:
                conditions.append(
                    (Event.created_by.in_(admin_user_ids)) & (Event.visibility == 'budget_curators')
                )
            if 'paid' in curator_group_types:
                conditions.append(
                    (Event.created_by.in_(admin_user_ids)) & (Event.visibility == 'paid_curators')
                )
            
            conditions.append(
                Event.id.in_(
                    db.query(EventParticipant.event_id).filter(
                        EventParticipant.group_id.in_(curator_group_ids)
                    )
                )
            )
            
            query = query.filter(or_(*conditions))
        else:
            # Куратор без групп видит только свои личные заметки и общие события
            query = query.filter(or_(
                Event.created_by == current_user.id,
                (Event.created_by.in_(admin_user_ids)) & (Event.visibility == 'all'),
            ))
            
    elif current_user.role == 3:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        student_group_id = student.group_students[0].group_id if student else None
        
        # Студент видит:
        # 1. Свои личные заметки (созданные им самим)
        # 2. События своей группы (созданные куратором для группы)
        # 3. Общие события для всех (созданные админом с visibility='all')
        # 4. Широковещательные события для всех категорий (созданные админом с visibility='all')
        query = query.filter(or_(
            Event.created_by == current_user.id,  # личные заметки
            Event.id.in_(
                db.query(EventParticipant.event_id).filter(
                    EventParticipant.group_id == student_group_id
                )
            ),  # события группы
            (Event.created_by.in_(admin_user_ids)) & (Event.visibility == 'all'),  # общие для всех
        ))
    
    if curator_id:
        query = query.filter(Event.curator_id == curator_id)
    
    if month and year:
        _, last_day = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)
        query = query.filter(Event.event_date >= start_date, Event.event_date <= end_date)
    
    events = query.order_by(Event.event_date).offset(skip).limit(limit).all()
    
    result = []
    for e in events:
        data = EventRead.model_validate(e)
        data.category_color = e.category.color if e.category else None
        data.category = e.category.name if e.category else None
        result.append(data)
    
    # Генерация birthday-событий
    if month and year and current_user.role != 1:
        students_query = db.query(Student).join(Student.user).filter(Student.birth_date.isnot(None))
        
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
                    is_completed=False,
                    visibility='private',
                    category='birthday',
                    category_color='#5b8cff',
                    created_at=s.created_at or datetime.now(),
                    updated_at=s.updated_at or datetime.now(),
                ))
    
    return result


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
    
    if current_user.role == 1:
        data['college_id'] = 1
        data['academic_year_id'] = 1
    elif current_user.role == 2:
        curator = db.query(Curator).filter(Curator.user_id == current_user.id).first()
        if not curator:
            raise HTTPException(status_code=404, detail="Куратор не найден")
        data['college_id'] = curator.college_id
        data['curator_id'] = curator.id
        data['academic_year_id'] = 1
        if data.get('visibility') == 'groups':
            data['group_ids'] = [g.id for g in curator.groups]
    elif current_user.role == 3:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Студент не найден")
        data['college_id'] = student.college_id
        data['academic_year_id'] = student.academic_year_id or 1
    
    event = create_event(db, data)
    result = EventRead.model_validate(event)
    result.category_color = event.category.color if event.category else None
    return result


@router.put("/{event_id}", response_model=EventRead)
def update_existing_event(
    event_id: int,
    event_in: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = update_event(db, event_id, event_in)
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