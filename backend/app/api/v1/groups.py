from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.schemas import GroupCreate, GroupUpdate, GroupRead
from app.services.group_service import (
    get_groups, get_group_by_id, create_group,
    update_group, delete_group, get_group_students
)

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get("/", response_model=List[GroupRead])
def get_all_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(15, ge=1, le=100),
    curator_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    groups = get_groups(db, skip, limit, curator_id, search)
    result = []
    for g in groups:
        data = GroupRead.model_validate(g)
        data.student_count = len([gs for gs in g.group_students if gs.is_active])
        result.append(data)
    return result


@router.get("/{group_id}", response_model=GroupRead)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = get_group_by_id(db, group_id)
    data = GroupRead.model_validate(group)
    data.student_count = len([gs for gs in group.group_students if gs.is_active])
    return data


@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_new_group(group_in: GroupCreate, db: Session = Depends(get_db)):
    group = create_group(db, group_in)
    return GroupRead.model_validate(group)


@router.put("/{group_id}", response_model=GroupRead)
def update_existing_group(
    group_id: int,
    group_in: GroupUpdate,
    db: Session = Depends(get_db)
):
    group = update_group(db, group_id, group_in)
    return GroupRead.model_validate(group)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_group(group_id: int, db: Session = Depends(get_db)):
    delete_group(db, group_id)
    return None