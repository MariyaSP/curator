from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    # Первичный ключ
    id = Column(Integer, primary_key=True, index=True)

    # Внешние ключи
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)

    # Основные данные
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)

    # Роль (хранится как число: 0-супервайзер, 1-админ, 2-куратор, 3-студент)
    role = Column(Integer, nullable=False, default=3)

    # Статус
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)

    # Связи (отношения) с другими таблицами
    college = relationship("College", back_populates="users")

    student = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    curator = relationship("Curator", back_populates="user", uselist=False, cascade="all, delete-orphan")

    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # Метод для красивого отображения в логах
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"git add 