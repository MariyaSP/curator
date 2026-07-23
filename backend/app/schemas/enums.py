from enum import Enum

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"

    @classmethod
    def get_display(cls, value: str) -> str:
        return {
            "MALE": "Мужской",
            "FEMALE": "Женский"
        }.get(value, value)

class EventType(str, Enum):
    MEETING = "MEETING"
    LECTURE = "LECTURE"
    EXAM = "EXAM"
    HOLIDAY = "HOLIDAY"
    OTHER = "OTHER"

class RecurrenceType(str, Enum):
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"

class CompetitionFormat(str, Enum):
    OFFLINE = "OFFLINE"
    ONLINE = "ONLINE"

    @classmethod
    def get_display(cls, value: str) -> str:
        return {
            "OFFLINE": "Очная",
            "ONLINE": "Заочная"
        }.get(value, value)

class CompetitionScope(str, Enum):
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

class CompetitionResultType(str, Enum):
    VICTORY = "VICTORY"
    PRIZE = "PRIZE"
    PARTICIPATION = "PARTICIPATION"
    DIPLOMA = "DIPLOMA"

class AchievementType(str, Enum):
    SPORT = "SPORT"
    ACADEMIC = "ACADEMIC"
    CREATIVE = "CREATIVE"
    OTHER = "OTHER"