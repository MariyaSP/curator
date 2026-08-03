from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy import Index
from .base import Base, TimestampMixin
import enum

class CompetitionFormat(str, enum.Enum):
    OFFLINE = "OFFLINE"   # очная
    ONLINE = "ONLINE"     # заочная

class CompetitionScope(str, enum.Enum):
    INTERNAL = "INTERNAL"           # внутренний
    CITY = "CITY"                   # городской
    REGIONAL = "REGIONAL"           # региональный
    OBLAST = "OBLAST"               # областной
    INTERREGIONAL = "INTERREGIONAL" # межрегиональный
    NATIONAL = "NATIONAL"           # всероссийский
    INTERNATIONAL = "INTERNATIONAL" # международный

class Competition(Base, TimestampMixin):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, index=True)
    
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    competition_date = Column(Date, nullable=False)
    format = Column(SQLEnum(CompetitionFormat), nullable=False, default=CompetitionFormat.OFFLINE)
    scope = Column(SQLEnum(CompetitionScope), nullable=False, default=CompetitionScope.INTERNAL)

    # Отношения
    # curator = relationship("Curator", back_populates="competitions")
    college = relationship("College", back_populates="competitions")
    academic_year = relationship("AcademicYear", back_populates="competitions")
    participants = relationship("CompetitionParticipant", back_populates="competition", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_competitions_college_id', 'college_id'),
        Index('ix_competitions_academic_year_id', 'academic_year_id'),
        Index('ix_competitions_competition_date', 'competition_date'),
        Index('ix_competitions_format', 'format'),
        Index('ix_competitions_scope', 'scope'),
    )

    def __repr__(self):
        return f"<Competition(id={self.id}, title={self.title}, format={self.format}, scope={self.scope})>"