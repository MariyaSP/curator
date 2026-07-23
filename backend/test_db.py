from app.core.database import engine, Base
from app.models import *


def test_connection():
    try:
        # Проверяем подключение
        with engine.connect() as conn:
            print("✅ Подключение к БД успешно!")

        # Проверяем наличие таблиц
        print("📋 Список таблиц:")
        # Можно сделать запрос к БД для проверки

        return True
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return False


if __name__ == "__main__":
    test_connection()