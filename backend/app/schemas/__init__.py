# backend/app/schemas/__init__.py

from .enums import (
    Gender, EventType, RecurrenceType,
    CompetitionFormat, CompetitionScope, CompetitionResultType, AchievementType
)
from .user import UserBase, UserCreate, UserUpdate, UserRead
from .student import (
    StudentBase, StudentCreate, StudentUpdate, StudentRead,
    AddressRead, PassportSchema,
    SocialStatusRead,
    HealthGroupRead,
    FamilyMemberCreate,
    FamilyMemberRead,
    DocumentRead,
    DocumentUploadResponse,
    DocumentTypeRead, 
    AchievementCreate,
    AchievementRead,
    CompetitionParticipantRead,
)
from .group import GroupBase, GroupCreate, GroupUpdate, GroupRead
from .event import EventBase, EventCreate, EventUpdate, EventRead, EventCategoryRead
from .auth import UserLogin, UserToken, PasswordResetRequest, PasswordResetConfirm
from .competition import (
    CompetitionBase, CompetitionCreate, CompetitionUpdate, CompetitionRead,
    CompetitionParticipantBase, CompetitionParticipantCreate
)
from .report import (
    ReportTemplateBase, ReportTemplateCreate, ReportTemplateUpdate, ReportTemplateRead,
    GeneratedReportBase, GeneratedReportCreate, GeneratedReportRead,
    ReportGenerateParams
)


__all__ = [
    # Enums
    "Gender",
    "EventType",
    "RecurrenceType",
    "CompetitionFormat",
    "CompetitionScope",
    "CompetitionResultType",
    "AchievementType",
    # User
    "UserBase", "UserCreate", "UserUpdate", "UserRead",
    # Student
    "StudentBase", "StudentCreate", "StudentUpdate", "StudentRead",
    "AddressRead", "PassportSchema",
    "SocialStatusRead",
    "HealthGroupRead",
    "FamilyMemberCreate",
    "FamilyMemberRead",
    "DocumentRead",
    "DocumentUploadResponse",
    "DocumentTypeRead",
    "AchievementCreate",
    "AchievementRead",
    "CompetitionParticipantRead",
    # Group
    "GroupBase", "GroupCreate", "GroupUpdate", "GroupRead",
    # Event
    "EventBase", "EventCreate", "EventUpdate", "EventRead",
    # Auth
    "UserLogin", "UserToken", "PasswordResetRequest", "PasswordResetConfirm",
    # Competition
    "CompetitionBase", "CompetitionCreate", "CompetitionUpdate", "CompetitionRead",
    "CompetitionParticipantBase", "CompetitionParticipantCreate",
    # Report
    "ReportTemplateBase", "ReportTemplateCreate", "ReportTemplateUpdate", "ReportTemplateRead",
    "GeneratedReportBase", "GeneratedReportCreate", "GeneratedReportRead",
    "ReportGenerateParams",
    "EventCategoryRead"
]