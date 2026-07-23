from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional

from app.models import Group, Curator, Student


def get_groups(
        db: Session,
        skip: int = 0,
        limit: int = 15,
        curator_id: Optional[int] = None,
        search: Optional[str] = None
) -> List[Group]:
    query = db.query(Group)
    if curator_id:
        query = query.filter(Group.curator_id == curator_id)
    if search:
        query = query.filter(Group.name.ilike(f"%{search}%"))
    return query.offset(skip).limit(limit).all()


def get_group_by_id(db: Session, group_id: int) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    return group


def create_group(db: Session, group_in) -> Group:
    curator = db.query(Curator).filter(Curator.id == group_in.curator_id).first()
    if not curator:
        raise HTTPException(status_code=404, detail="Куратор не найден")

    existing = db.query(Group).filter(Group.name == group_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Группа с таким названием уже существует")

    group = Group(**group_in.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def update_group(db: Session, group_id: int, group_in) -> Group:
    group = get_group_by_id(db, group_id)
    update_data = group_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return group


def delete_group(db: Session, group_id: int) -> None:
    group = get_group_by_id(db, group_id)
    db.delete(group)
    db.commit()


def get_group_students(db: Session, group_id: int) -> List[Student]:
    group = get_group_by_id(db, group_id)
    return [gs.student for gs in group.group_students if gs.is_active]