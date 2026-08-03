from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional

from app.models import Competition, Curator, CompetitionParticipant, Student
from app.schemas import CompetitionCreate, CompetitionUpdate, CompetitionParticipantCreate


def get_competitions(
        db: Session,
        skip: int = 0,
        limit: int = 15,
        curator_id: Optional[int] = None,
        scope: Optional[str] = None,
        format: Optional[str] = None
) -> List[Competition]:
    query = db.query(Competition)
    if curator_id:
        query = query.filter(Competition.curator_id == curator_id)
    if scope:
        query = query.filter(Competition.scope == scope)
    if format:
        query = query.filter(Competition.format == format)
    return query.offset(skip).limit(limit).all()


def get_competition_by_id(db: Session, competition_id: int) -> Competition:
    competition = db.query(Competition).filter(Competition.id == competition_id).first()
    if not competition:
        raise HTTPException(status_code=404, detail="Конкурс не найден")
    return competition


def create_competition(db: Session, competition_in: CompetitionCreate) -> Competition:
    # Проверяем, существует ли такой конкурс
    existing = db.query(Competition).filter(
        Competition.title == competition_in.title,
        Competition.competition_date == competition_in.competition_date,
        Competition.format == competition_in.format,
        Competition.scope == competition_in.scope,
        Competition.college_id == competition_in.college_id
    ).first()
    
    if existing:
        return existing
    
    competition = Competition(**competition_in.dict())
    db.add(competition)
    db.commit()
    db.refresh(competition)
    return competition


def update_competition(db: Session, competition_id: int, competition_in: CompetitionUpdate) -> Competition:
    competition = get_competition_by_id(db, competition_id)
    update_data = competition_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(competition, field, value)
    db.commit()
    db.refresh(competition)
    return competition


def delete_competition(db: Session, competition_id: int) -> None:
    competition = get_competition_by_id(db, competition_id)
    db.delete(competition)
    db.commit()


def get_participants_by_competition(db: Session, competition_id: int) -> List[CompetitionParticipant]:
    get_competition_by_id(db, competition_id)  # проверяем, что конкурс существует
    return db.query(CompetitionParticipant).filter(
        CompetitionParticipant.competition_id == competition_id
    ).all()


def add_participant(db: Session, participant_in: CompetitionParticipantCreate) -> CompetitionParticipant:
    competition = get_competition_by_id(db, participant_in.competition_id)
    student = db.query(Student).filter(Student.id == participant_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    participant = CompetitionParticipant(**participant_in.model_dump())
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def remove_participant(db: Session, participant_id: int) -> None:
    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.id == participant_id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Участник не найден")
    db.delete(participant)
    db.commit()