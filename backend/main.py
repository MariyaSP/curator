from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Система куратора", version="0.1.0")

# Разрешаем фронтенду обращаться к бэкенду (иначе будет ошибка CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # адрес фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Сервер работает!"}

@app.get("/api/health")
def health():
    return {"status": "ok", "message": "База данных ещё не подключена, но мы живы"}