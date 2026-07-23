import enum


class UserRole(int, enum.Enum):
    SUPERVISOR = 0
    ADMIN = 1
    CURATOR = 2
    STUDENT = 3

    @classmethod
    def get_display_name(cls, value):
        names = {
            0: "Супервайзер",
            1: "Администратор",
            2: "Куратор",
            3: "Студент"
        }
        return names.get(value, "Неизвестно")


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"

    @classmethod
    def get_display_name(cls, value):
        """Возвращает название на русском для отображения в интерфейсе"""
        display_names = {
            "male": "Мужской",
            "female": "Женский"
        }
        return display_names.get(value, value)

    @classmethod
    def get_choices(cls):
        """Для выпадающего списка в формах"""
        return [(item.value, item.get_display_name(item.value)) for item in cls]


class AchievementType(str, enum.Enum):
    SPORT = "sport"
    ACADEMIC = "academic"
    CREATIVE = "creative"
    OTHER = "other"


class CompetitionResultType(str, enum.Enum):
    VICTORY = "victory"
    PRIZE = "prize"
    PARTICIPATION = "participation"
    DIPLOMA = "diploma"


class EventType(str, enum.Enum):
    MEETING = "meeting"
    LECTURE = "lecture"
    EXAM = "exam"
    HOLIDAY = "holiday"
    OTHER = "other"


class RecurrenceType(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class NotificationPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"


class AuditSource(str, enum.Enum):
    API = "api"
    WEB = "web"
    MOBILE = "mobile"
    IMPORT = "import"
    SYSTEM = "system"


class FileType(str, enum.Enum):
    PDF = "pdf"
    JPG = "jpg"
    JPEG = "jpeg"
    PNG = "png"
    DOCX = "docx"
    XLSX = "xlsx"
    CSV = "csv"

class CompetitionFormat(str, enum.Enum):
    OFFLINE = "OFFLINE"
    ONLINE = "ONLINE"

    @classmethod
    def get_display(cls, value: str) -> str:
        return {
            "OFFLINE": "Очная",
            "ONLINE": "Заочная"
        }.get(value, value)

class CompetitionScope(str, enum.Enum):
    INTERNAL = "INTERNAL"
    CITY = "CITY"
    REGIONAL = "REGIONAL"
    OBLAST = "OBLAST"
    INTERREGIONAL = "INTERREGIONAL"
    NATIONAL = "NATIONAL"
    INTERNATIONAL = "INTERNATIONAL"

    @classmethod
    def get_display(cls, value: str) -> str:
        return {
            "INTERNAL": "Внутренний",
            "CITY": "Городской",
            "REGIONAL": "Региональный",
            "OBLAST": "Областной",
            "INTERREGIONAL": "Межрегиональный",
            "NATIONAL": "Всероссийский",
            "INTERNATIONAL": "Международный"
        }.get(value, value)