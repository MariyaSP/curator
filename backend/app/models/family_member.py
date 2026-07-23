from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from sqlalchemy import Index

class FamilyMember(Base, TimestampMixin):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    full_name = Column(String(200), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # степень родства
    birth_date = Column(Date, nullable=True)
    work_place = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)

    __table_args__ = (
        Index('ix_family_members_student_id', 'student_id'),
    )

    # Отношения
    student = relationship("Student", back_populates="family_members")