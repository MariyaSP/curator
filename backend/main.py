from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import (
    students_router,
    auth_router,
    groups_router,
    events_router,
    competitions_router,
    reports_router,
    users_router,
)

app = FastAPI(
    title="Система для автоматизации работы куратора в колледже",
    version="1.0.0",
    description="Мультитенантная система управления студентами и кураторами"
)

# ===== НАСТРОЙКА CORS (ПРАВИЛЬНАЯ) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(students_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(groups_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(competitions_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Система куратора работает!",
        "version": "1.0.0",
        "status": "ok"
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )