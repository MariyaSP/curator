from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .base import Base, TimestampMixin


class StudentDocument(Base, TimestampMixin):
    __tablename__ = "student_documents"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    document_type_id = Column(Integer, ForeignKey("document_types.id", ondelete="SET NULL"), nullable=True)  # 🟢 Добавлено
    title = Column(String(200), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("Student", back_populates="documents")
    document_type = relationship("DocumentType")  