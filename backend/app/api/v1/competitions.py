from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.schemas import (
    CompetitionCreate,
    CompetitionUpdate,
    CompetitionRead,
    CompetitionParticipantCreate,
    CompetitionParticipantRead
)
from app.services import competition_service

router = APIRouter(prefix="/competitions", tags=["Competitions"])


# ========== КОНКУРСЫ ==========

@router.get("/", response_model=List[CompetitionRead])
def get_all_competitions(
    skip: int = Query(0, ge=0),
    limit: int = Query(15, ge=1, le=100),
    curator_id: Optional[int] = None,
    scope: Optional[str] = None,
    format: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Получить список конкурсов с фильтрацией и пагинацией"""
    competitions = competition_service.get_competitions(
        db, skip, limit, curator_id, scope, format
    )
    return [CompetitionRead.model_validate(c) for c in competitions]


@router.get("/{competition_id}", response_model=CompetitionRead)
def get_competition_by_id(
    competition_id: int,
    db: Session = Depends(get_db)
):
    """Получить конкурс по ID"""
    competition = competition_service.get_competition_by_id(db, competition_id)
    return CompetitionRead.model_validate(competition)


@router.post("/", response_model=CompetitionRead, status_code=status.HTTP_201_CREATED)
def create_new_competition(
    competition_in: CompetitionCreate,
    db: Session = Depends(get_db)
):
    """Создать новый конкурс"""
    competition = competition_service.create_competition(db, competition_in)
    return CompetitionRead.model_validate(competition)


@router.put("/{competition_id}", response_model=CompetitionRead)
def update_existing_competition(
    competition_id: int,
    competition_in: CompetitionUpdate,
    db: Session = Depends(get_db)
):
    """Обновить данные конкурса"""
    competition = competition_service.update_competition(db, competition_id, competition_in)
    return CompetitionRead.model_validate(competition)


@router.delete("/{competition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_competition(
    competition_id: int,
    db: Session = Depends(get_db)
):
    """Удалить конкурс"""
    competition_service.delete_competition(db, competition_id)
    return None


# ========== УЧАСТНИКИ КОНКУРСОВ ==========

@router.get("/{competition_id}/participants", response_model=List[CompetitionParticipantRead])
def get_competition_participants(
    competition_id: int,
    db: Session = Depends(get_db)
):
    """Получить список участников конкурса"""
    participants = competition_service.get_participants_by_competition(db, competition_id)
    return [CompetitionParticipantRead.model_validate(p) for p in participants]


@router.post("/participants", response_model=CompetitionParticipantRead, status_code=status.HTTP_201_CREATED)
def add_participant_to_competition(
    participant_in: CompetitionParticipantCreate,
    db: Session = Depends(get_db)
):
    """Добавить участника в конкурс"""
    participant = competition_service.add_participant(db, participant_in)
    return CompetitionParticipantRead(
        id=participant.id,
        competition_id=participant.competition_id,
        student_id=participant.student_id,
        result_type=participant.result_type.value.upper() if participant.result_type else None,
        result_description=participant.result_description,
        file_path=participant.file_path,
        file_type=participant.file_type.value if participant.file_type else None,
        created_at=participant.created_at,
    )


@router.delete("/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant_from_competition(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Удалить участника из конкурса"""
    competition_service.remove_participant(db, participant_id)
    return None

@router.get("/by-curator/{curator_id}", response_model=List[CompetitionRead])
def get_competitions_by_curator(
    curator_id: int,
    db: Session = Depends(get_db)
):
    """Получить конкурсы конкретного преподавателя."""
    competitions = competition_service.get_competitions_by_curator(db, curator_id)
    return [CompetitionRead.model_validate(c) for c in competitions]