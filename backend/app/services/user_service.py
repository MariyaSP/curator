import os
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.models import User


def generate_credentials_pdf(db: Session, user_id: int) -> str:
    """
    Генерирует PDF-карточку с логином и паролем пользователя.
    Стиль — минималистичный, как в образце.
    """
    # 1. Получаем пользователя из БД
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # 2. Создаём папку для отчётов (если её нет)
    reports_dir = "uploads/reports"
    os.makedirs(reports_dir, exist_ok=True)

    # 3. Генерируем уникальное имя файла
    filename = f"credentials_{uuid.uuid4().hex[:8]}.pdf"
    file_path = os.path.join(reports_dir, filename)

    # 4. Подключаем шрифт Arial для поддержки кириллицы
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
        font_name = 'Arial'
    except:
        # Если Arial не найден — используем Helvetica (будет квадратики)
        font_name = 'Helvetica'

    # 5. Создаём PDF-документ
    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4

    # ========== НАСТРОЙКИ ОТСТУПОВ ==========
    left_margin = 60          # отступ слева
    top_margin = height - 60  # отступ сверху
    line_spacing = 28         # расстояние между строками
    block_spacing = 15        # расстояние между блоками

    # ========== 1. ЗАГОЛОВОК ==========
    c.setFont(font_name, 18)
    c.setFillColorRGB(0, 0, 0)  # чёрный
    c.drawString(left_margin, top_margin, "Данные для входа в систему")

    # ========== 2. ОТСТУП ПОСЛЕ ЗАГОЛОВКА ==========
    y = top_margin - 2 * line_spacing

    # ========== 3. ФИО ==========
    c.setFont(font_name, 14)
    c.drawString(left_margin, y, "Пользователь:")
    c.drawString(left_margin + 130, y, user.full_name)
    y -= line_spacing

    # ========== 4. РОЛЬ ==========
    role_names = {0: "Супервайзер", 1: "Администратор", 2: "Куратор", 3: "Студент"}
    c.drawString(left_margin, y, "Роль:")
    c.drawString(left_margin + 130, y, role_names.get(user.role, "Неизвестно"))

    # ========== 5. ОТСТУП ПЕРЕД БЛОКОМ С ЛОГИНОМ И ПАРОЛЕМ ==========
    y -= block_spacing

    # ========== 6. ЗАГОЛОВОК БЛОКА "Данные для входа" ==========
    c.setFont(font_name, 14)
    c.drawString(left_margin, y, "Данные для входа:")
    y -= line_spacing

    # ========== 7. ЛОГИН ==========
    c.setFont(font_name, 14)
    c.drawString(left_margin, y, "Логин:")
    c.drawString(left_margin + 130, y, user.email)
    y -= line_spacing

    # ========== 8. ПАРОЛЬ ==========
    c.drawString(left_margin, y, "Пароль:")
    c.drawString(left_margin + 130, y, "admin123")  # ⚠️ ВРЕМЕННЫЙ ПАРОЛЬ

    # ========== 9. ОТСТУП ПЕРЕД ПРЕДУПРЕЖДЕНИЕМ ==========
    y -= block_spacing

    # ========== 10. ПРЕДУПРЕЖДЕНИЕ (КРАСНЫМ) ==========
    c.setFont(font_name, 12)
    c.setFillColorRGB(0.8, 0.2, 0.2)  # красный
    c.drawString(left_margin, y, "Пароль действителен до первого входа.")
    y -= line_spacing - 5
    c.drawString(left_margin, y, "После входа обязательно смените пароль в личном кабинете.")

    # ========== 11. ПОДВАЛ (ДАТА) ==========
    c.setFont(font_name, 10)
    c.setFillColorRGB(0.5, 0.5, 0.5)  # серый
    c.drawString(left_margin, 60, f"Сгенерировано системой куратора {datetime.now().strftime('%d.%m.%Y')}")

    # ========== СОХРАНЯЕМ PDF ==========
    c.save()
    return file_path