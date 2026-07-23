from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
from sqlalchemy import Index

class GroupStudent(Base):
    __tablename__ = "group_students"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index('ix_group_students_group_id', 'group_id'),
        Index('ix_group_students_student_id', 'student_id'),
        Index('ix_group_students_is_active', 'is_active'),
    )

    # Отношения
    group = relationship("Group", back_populates="group_students")
    student = relationship("Student", back_populates="group_students")