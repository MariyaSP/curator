from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from .base import Base

class DocumentType(Base):
    __tablename__ = "document_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)

    documents = relationship("StudentDocument", back_populates="document_type")