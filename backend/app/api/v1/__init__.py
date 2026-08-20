from .students import router as students_router
from .auth import router as auth_router
from .groups import router as groups_router
from .events import router as events_router
from .competitions import router as competitions_router
from .reports import router as reports_router
from .users import router as users_router
from .references import router as references_router


__all__ = [
    "students_router",
    "auth_router",
    "groups_router",
    "events_router",
    "competitions_router",
    "reports_router",
    "users_router",
    "references_router",
   
]