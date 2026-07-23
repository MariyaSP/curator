from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from .enums import AchievementType, FileType
from sqlalchemy import Index

class StudentAchievement(Base, TimestampMixin):
    __tablename__ = "student_achievements"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    achievement_date = Column(Date, nullable=False)
    achievement_type = Column(Enum(AchievementType), nullable=False)
    file_path = Column(String(255), nullable=True)
    file_type = Column(Enum(FileType), nullable=True)

    __table_args__ = (
        Index('ix_student_achievements_student_id', 'student_id'),
        Index('ix_student_achievements_achievement_date', 'achievement_date'),
    )

    # Отношения
    student = relationship("Student", back_populates="achievements")