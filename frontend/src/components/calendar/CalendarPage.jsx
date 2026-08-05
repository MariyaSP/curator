// frontend/src/components/calendar/CalendarPage.jsx
import React, { useState, useEffect } from 'react'
import api from '../../api/client'
import './CalendarPage.css'
import arrowIcon from '../../assets/icons/arrow.png'
import bdIcon from '../../assets/icons/cake.png'
import taskIcon from '../../assets/icons/task.png'
import filterIcon from '../../assets/icons/filter.png'
import chartIcon from '../../assets/icons/chart.png'

const CalendarPage = () => {
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskTime, setTaskTime] = useState('09:00')
  const [taskCategory, setTaskCategory] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [filter, setFilter] = useState({})
  const [draggedEvent, setDraggedEvent] = useState(null)

  // Загрузка категорий
  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/events/categories')
      setCategories(res.data)
      const initialFilter = {}
      res.data.forEach(cat => { initialFilter[cat.id] = true })
      initialFilter['done'] = true
      setFilter(initialFilter)
      if (res.data.length > 0) {
        const firstNonBirthday = res.data.find(c => c.name !== 'Дни рождения')
        setTaskCategory(firstNonBirthday ? firstNonBirthday.id : res.data[0].id)
      }
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err)
    }
  }

  // Загрузка событий
  useEffect(() => { if (categories.length > 0) fetchEvents() }, [currentMonth, currentYear, categories])

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/', { params: { month: currentMonth + 1, year: currentYear, limit: 200 } })
      setEvents(res.data)
    } catch (err) { console.error('Ошибка загрузки событий:', err) }
  }

  // Навигация
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  // Построение дней
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const days = []
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = currentMonth === 0 ? 12 : currentMonth
    const y = currentMonth === 0 ? currentYear - 1 : currentYear
    days.push({ day: d, month: 'prev', date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, month: 'current', date: `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}` })
  }
  const totalCells = Math.ceil(days.length / 5) * 5
  for (let i = days.length; i < totalCells; i++) {
    const d = i - days.length + 1
    const m = currentMonth === 11 ? 1 : currentMonth + 2
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    days.push({ day: d, month: 'next', date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }

  // Хелперы
  const getCategoryById = (id) => categories.find(c => c.id === id)

  // 🟢 ИСПРАВЛЕНО: фильтрация дней рождения через категорию из БД
  const getEventsForDate = (dateStr) => {
    const birthdayCat = categories.find(c => c.name === 'Дни рождения')
    return events.filter(e => {
      if (e.category === 'birthday') {
        if (birthdayCat && !filter[birthdayCat.id]) return false
        return e.event_date === dateStr
      }
      if (e.is_completed && !filter.done) return false
      if (!filter[e.category_id]) return false
      return e.event_date === dateStr
    })
  }

  const getCategoryStyle = (catId, isCompleted, catName) => {
    if (isCompleted) return 'done'
    if (catName === 'birthday') return 'birthday'
    const cat = getCategoryById(catId)
    return cat ? `cat-${cat.id}` : 'other'
  }

  // Статистика
  const monthEvents = events.filter(e => {
    const d = new Date(e.event_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.category !== 'birthday'
  })
  const doneCount = monthEvents.filter(e => e.is_completed).length
  const plannedCount = monthEvents.filter(e => !e.is_completed).length
  const todayStr = today.toISOString().split('T')[0]
  const todayEvents = events.filter(e => e.event_date === todayStr)
  const birthdays = events.filter(e => e.category === 'birthday' && new Date(e.event_date).getMonth() === currentMonth)

  // Модалка
  const openModal = (date) => {
    setSelectedDate(date)
    setTaskTitle('')
    setTaskDesc('')
    setTaskTime('09:00')
    setIsModalOpen(true)
  }

  const addEvent = async () => {
    if (!taskTitle.trim()) return
    try {
      await api.post('/events/', {
        title: taskTitle, event_date: selectedDate, start_time: taskTime,
        category_id: taskCategory, description: taskDesc,
        college_id: 1, curator_id: 1, academic_year_id: 1, event_type: 'OTHER',
      })
      setIsModalOpen(false)
      fetchEvents()
    } catch (err) { console.error('Ошибка создания события:', err); alert('Не удалось создать событие') }
  }

  // Drag-and-drop
  const handleDragStart = (e, event) => { setDraggedEvent(event); e.dataTransfer.effectAllowed = 'move' }
  const handleDrop = async (e, dateStr) => {
    e.preventDefault()
    if (draggedEvent && draggedEvent.event_date !== dateStr) {
      try {
        await api.put(`/events/${draggedEvent.id}`, { event_date: dateStr })
        fetchEvents()
      } catch (err) { console.error('Ошибка перемещения события:', err) }
    }
    setDraggedEvent(null)
  }

  const toggleComplete = async (event) => {
    if (event.category === 'birthday') return
    try {
      await api.put(`/events/${event.id}`, { is_completed: !event.is_completed })
      fetchEvents()
    } catch (err) { console.error('Ошибка обновления события:', err) }
  }

  return (
    <div className="calendar-dashboard">
      <main className="calendar-main">
        <div className="calendar-topbar">
          <div className="month-nav">
            <button className="month-nav-btn" onClick={prevMonth}><img src={arrowIcon} alt="Назад" className="nav-icon" /></button>
            <h2>{monthNames[currentMonth]} <span>{currentYear}</span></h2>
            <button className="month-nav-btn" onClick={nextMonth}><img src={arrowIcon} alt="Вперёд" className="nav-icon nav-icon-right" /></button>
          </div>
          <button className="add-task-btn" onClick={() => openModal(todayStr)}>+ Добавить</button>
        </div>

        <div className="weekdays-row"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span></div>

        <div className="days-grid-5">
          {days.map((d, i) => {
            const dayEvents = getEventsForDate(d.date)
            const isToday = d.date === todayStr
            return (
              <div key={i} className={`day-cell ${d.month !== 'current' ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onDoubleClick={() => d.month === 'current' && openModal(d.date)}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, d.date)}>
                <div className="day-number">{d.day}{dayEvents.length > 0 && <span className="task-count">({dayEvents.length})</span>}</div>
                {dayEvents.map(ev => (
                  <div key={ev.id} className={`task-chip ${getCategoryStyle(ev.category_id, ev.is_completed, ev.category)}`}
                    draggable={!ev.is_completed && ev.category !== 'birthday'}
                    onDragStart={(e) => handleDragStart(e, ev)}
                    onClick={() => !ev.is_completed && ev.category !== 'birthday' && toggleComplete(ev)}
                    title={ev.title}
                    style={getCategoryById(ev.category_id) ? { borderLeftColor: getCategoryById(ev.category_id)?.color } : {}}>
                    {ev.start_time && <span className="task-time">{ev.start_time?.slice(0,5)}</span>}
                    <span className="task-label">{ev.title}</span>
                    {ev.is_completed && <span className="check-icon">✓</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </main>

      <aside className="calendar-sidebar">
        <div className="side-card">
          <div className='side-card-title'><img src={chartIcon} alt="Статистика" className="side-card-icon" /><h4> Статистика за месяц</h4></div>
          <div className="stats-grid">
            <div className="stat-block"><span className="stat-number green">{doneCount}</span><span className="stat-label">Выполнено</span></div>
            <div className="stat-block"><span className="stat-number blue">{plannedCount}</span><span className="stat-label">Запланировано</span></div>
            <div className="stat-block"><span className="stat-number orange">0</span><span className="stat-label">Просрочено</span></div>
          </div>
        </div>

        <div className="side-card">
          <div className='side-card-title'><img src={bdIcon} alt="Дни рождения" className="side-card-icon" /><h4> Дни рождения</h4></div>
          {birthdays.slice(0, 4).map(ev => (
            <div key={ev.id} className="birthday-row">
              <div className="birthday-avatar">{new Date(ev.event_date).getDate()}</div>
              <span className="birthday-name">{ev.title?.replace('ДР — ', '')}</span>
            </div>
          ))}
          {birthdays.length === 0 && <div className="empty-text">Нет дней рождений</div>}
        </div>

        <div className="side-card">
          <div className='side-card-title'><img src={taskIcon} alt="Задачи на сегодня" className="side-card-icon" /><h4> Задачи на сегодня</h4></div>
          {todayEvents.length > 0 ? todayEvents.map(ev => (
            <div key={ev.id} className={`today-task ${ev.is_completed ? 'done' : ''}`}>
              {ev.start_time && <span className="today-time">{ev.start_time?.slice(0,5)}</span>}
              <span className="today-text" style={ev.is_completed ? { textDecoration: 'line-through' } : {}}>{ev.title}</span>
              <span className={`task-tag ${getCategoryStyle(ev.category_id, ev.is_completed, ev.category)}`}>
                {ev.is_completed ? 'Выполнено' : getCategoryById(ev.category_id)?.name || ev.category}
              </span>
            </div>
          )) : <div className="empty-text">Нет задач на сегодня</div>}
        </div>

        {/* 🟢 ФИЛЬТРЫ: только категории из БД + статичный "Выполнено" */}
        <div className="side-card">
          <div className='side-card-title'><img src={filterIcon} alt="Фильтры" className="side-card-icon" /><h4> Фильтр</h4></div>
          {categories.map(cat => (
            <label key={cat.id} className={`legend-item ${!filter[cat.id] ? 'muted' : ''}`}>
              <input type="checkbox" checked={filter[cat.id] || false} onChange={() => setFilter(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))} />
              <span className="legend-dot" style={{ backgroundColor: cat.color }}></span>
              {cat.name}
            </label>
          ))}
          <label className={`legend-item ${!filter.done ? 'muted' : ''}`}>
            <input type="checkbox" checked={filter.done || false} onChange={() => setFilter(prev => ({ ...prev, done: !prev.done }))} />
            <span className="legend-dot" style={{ backgroundColor: '#e8eaed', border: '1px solid #5f6368' }}></span>
            Выполнено
          </label>
        </div>
      </aside>

      {isModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>📝 Новое событие</h3>
            <p className="modal-sub">Добавление на {selectedDate}</p>
            <div className="form-group"><label>Название</label><input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Введите название..." /></div>
            <div className="form-group"><label>Время</label><input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} /></div>
            <div className="form-group"><label>Категория</label>
              <select value={taskCategory} onChange={e => setTaskCategory(e.target.value)}>
                {categories.filter(c => c.name !== 'Дни рождения').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Описание</label><textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Дополнительная информация..." rows={3} /></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button className="btn-save" onClick={addEvent}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarPage