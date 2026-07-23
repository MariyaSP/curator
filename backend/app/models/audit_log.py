from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
from .enums import AuditAction, AuditSource


class AuditLog(Base):
    __tablename__ = "audit_logs"

    # ========== Основные поля ==========
    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # ========== Информация о действии ==========
    action = Column(Enum(AuditAction), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)

    # ========== Структурированные данные об изменениях (НОВОЕ!) ==========
    field_name = Column(String(100), nullable=True)   # какое поле изменилось
    old_value = Column(Text, nullable=True)           # старое значение
    new_value = Column(Text, nullable=True)           # новое значение

    # ========== JSON-данные для сложных изменений ==========
    old_data = Column(JSON, nullable=True)            # полные старые данные (на всякий случай)
    new_data = Column(JSON, nullable=True)            # полные новые данные

    # ========== Метаданные ==========
    source = Column(Enum(AuditSource), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ========== Индексы для быстрого поиска ==========
    __table_args__ = (
        Index('ix_audit_logs_college_id', 'college_id'),
        Index('ix_audit_logs_user_id', 'user_id'),
        Index('ix_audit_logs_entity_type', 'entity_type'),
        Index('ix_audit_logs_created_at', 'created_at'),
        Index('ix_audit_logs_action', 'action'),
        Index('ix_audit_logs_field_name', 'field_name'),
        Index('ix_audit_logs_entity_id', 'entity_id'),
    )

    # ========== Отношения ==========
    college = relationship("College", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

    # ========== Методы ==========
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, entity={self.entity_type}:{self.entity_id}, user={self.user_id})>"

    @classmethod
    def create_from_change(cls, user_id, college_id, entity_type, entity_id,
                           field_name, old_value, new_value,
                           source=AuditSource.API, ip_address=None, user_agent=None):
        """
        Упрощённый метод для создания записи об изменении одного поля.
        """
        return cls(
            user_id=user_id,
            college_id=college_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.UPDATE,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            source=source,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @classmethod
    def create_delete_log(cls, user_id, college_id, entity_type, entity_id,
                          old_data, source=AuditSource.API, ip_address=None, user_agent=None):
        """
        Создание записи об удалении.
        """
        return cls(
            user_id=user_id,
            college_id=college_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.DELETE,
            old_data=old_data,
            source=source,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @classmethod
    def create_create_log(cls, user_id, college_id, entity_type, entity_id,
                          new_data, source=AuditSource.API, ip_address=None, user_agent=None):
        """
        Создание записи о создании.
        """
        return cls(
            user_id=user_id,
            college_id=college_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.CREATE,
            new_data=new_data,
            source=source,
            ip_address=ip_address,
            user_agent=user_agent
        )