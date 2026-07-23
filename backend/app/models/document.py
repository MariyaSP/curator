from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
from .enums import FileType
from sqlalchemy import Index

class StudentDocument(Base):
    __tablename__ = "student_documents"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=False)
    title = Column(String(200), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_type = Column(Enum(FileType), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_student_documents_student_id', 'student_id'),
        Index('ix_student_documents_document_type_id', 'document_type_id'),
    )

    # Отношения
    student = relationship("Student", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")