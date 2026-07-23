from sqlalchemy import Column, Integer, ForeignKey, Enum, Text, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
from .enums import CompetitionResultType, FileType
from sqlalchemy import Index


class CompetitionParticipant(Base):
    __tablename__ = "competition_participants"

    id = Column(Integer, primary_key=True, index=True)
    competition_id = Column(Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)

    # Результат участия
    result_type = Column(Enum(CompetitionResultType), nullable=True)
    result_description = Column(Text, nullable=True)

    # Файл с результатом (диплом, сертификат, протокол)
    file_path = Column(String(255), nullable=True)
    file_type = Column(Enum(FileType), nullable=True)
    file_name = Column(String(200), nullable=True)  # оригинальное имя

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_comp_participants_competition_id', 'competition_id'),
        Index('ix_comp_participants_student_id', 'student_id'),
    )

    # Отношения
    competition = relationship("Competition", back_populates="participants")
    student = relationship("Student", back_populates="competition_participants")