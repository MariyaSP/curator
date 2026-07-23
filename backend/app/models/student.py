from sqlalchemy import Column, Integer, String, Date, Text, Boolean, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy import Index
from .base import Base, TimestampMixin
from .enums import Gender


class Student(Base, TimestampMixin):
    __tablename__ = "students"

    # ========== Первичный ключ и связи ==========
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)

    # ========== Статус студента ==========
    is_active = Column(Boolean, default=True, nullable=False)
    is_graduated = Column(Boolean, default=False, nullable=False)
    graduation_date = Column(DateTime, nullable=True)

    # ========== Основные данные ==========
    personal_number = Column(String(6), unique=True, nullable=False, index=True)
    photo = Column(String(255), nullable=True)
    enrollment_order_data = Column(Text, nullable=True)
    birth_date = Column(Date, nullable=False)
    citizenship = Column(String(100), nullable=True)

    # ========== Паспортные данные ==========
    passport_series = Column(String(10), nullable=True)
    passport_number = Column(String(20), nullable=True)
    passport_issue_date = Column(Date, nullable=True)
    passport_issued_by = Column(String(255), nullable=True)
    passport_department_code = Column(String(20), nullable=True)

    # ========== Адрес регистрации (декомпозирован) ==========
    registration_region = Column(String(100), nullable=True)
    registration_city = Column(String(100), nullable=False)
    registration_street = Column(String(200), nullable=True)
    registration_house = Column(String(20), nullable=True)
    registration_apartment = Column(String(10), nullable=True)
    registration_zip = Column(String(10), nullable=True)

    # ========== Фактический адрес (декомпозирован) ==========
    actual_region = Column(String(100), nullable=True)
    actual_city = Column(String(100), nullable=False)
    actual_street = Column(String(200), nullable=True)
    actual_house = Column(String(20), nullable=True)
    actual_apartment = Column(String(10), nullable=True)
    actual_zip = Column(String(10), nullable=True)

    # ========== Документы ==========
    inn = Column(String(12), nullable=True)
    snils = Column(String(14), nullable=True)
    medical_policy = Column(String(20), nullable=True)

    # ========== Контакты ==========
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)

    # ========== Социальные данные ==========
    gender = Column(Enum(Gender), nullable=True)
    health_group_id = Column(Integer, ForeignKey("health_groups.id", ondelete="SET NULL"), nullable=True)
    social_status_id = Column(Integer, ForeignKey("social_statuses.id", ondelete="SET NULL"), nullable=True)
    is_disabled = Column(Boolean, default=False)
    disability_group = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)

    # ========== Индексы для быстрого поиска ==========
    __table_args__ = (
        Index('ix_students_college_id', 'college_id'),
        Index('ix_students_user_id', 'user_id'),
        Index('ix_students_academic_year_id', 'academic_year_id'),
        Index('ix_students_personal_number', 'personal_number'),
        Index('ix_students_birth_date', 'birth_date'),
        Index('ix_students_social_status_id', 'social_status_id'),
        Index('ix_students_gender', 'gender'),
        Index('ix_students_is_active', 'is_active'),
        Index('ix_students_is_graduated', 'is_graduated'),
        Index('ix_students_registration_city', 'registration_city'),
        Index('ix_students_actual_city', 'actual_city'),
    )

    # ========== Отношения ==========
    user = relationship("User", back_populates="student")
    college = relationship("College", back_populates="students")
    academic_year = relationship("AcademicYear", back_populates="students")
    health_group = relationship("HealthGroup", back_populates="students")
    social_status = relationship("SocialStatus", back_populates="students")

    family_members = relationship("FamilyMember", back_populates="student", cascade="all, delete-orphan")
    documents = relationship("StudentDocument", back_populates="student", cascade="all, delete-orphan")
    achievements = relationship("StudentAchievement", back_populates="student", cascade="all, delete-orphan")
    competition_participants = relationship("CompetitionParticipant", back_populates="student", cascade="all, delete-orphan")
    group_students = relationship("GroupStudent", back_populates="student", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Student(id={self.id}, personal_number={self.personal_number}, full_name={self.user.full_name if self.user else None})>"