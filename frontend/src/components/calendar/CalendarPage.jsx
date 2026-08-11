// frontend/src/components/calendar/CalendarPage.jsx
import React, { useState, useEffect } from 'react'
import api from '../../api/client'
import './CalendarPage.css'
import arrowIcon from '../../assets/icons/arrow.png'
import bdIcon from '../../assets/icons/cake.png'
import taskIcon from '../../assets/icons/task.png'
import filterIcon from '../../assets/icons/filter.png'
import chartIcon from '../../assets/icons/chart.png'
import { useAuth } from '../../context/AuthContext'

const CalendarPage = () => {
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

  const { user } = useAuth()
  const userRole = user?.role
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editEventId, setEditEventId] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskTime, setTaskTime] = useState('09:00')
  const [taskCategory, setTaskCategory] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskVisibility, setTaskVisibility] = useState('private')
  const [filter, setFilter] = useState({})
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [taskRecurrence, setTaskRecurrence] = useState('')
  const [taskRecurrenceEnd, setTaskRecurrenceEnd] = useState('')
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  useEffect(() => { fetchCategories() }, [])

  useEffect(() => {
    let ws = null
    let reconnectTimer = null
    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws/events')
      ws.onopen = () => console.log('🟢 WebSocket подключён')
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'event_created' || message.type === 'event_updated' || message.type === 'event_deleted') {
          fetchEvents()
        }
      }
      ws.onerror = () => {}
      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 5000)
      }
    }
    connect()
    return () => {
      if (ws) ws.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [currentMonth, currentYear])

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
    } catch (err) { console.error('Ошибка загрузки категорий:', err) }
  }

  useEffect(() => { if (categories.length > 0) fetchEvents() }, [currentMonth, currentYear, categories])

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/', { params: { month: currentMonth + 1, year: currentYear, limit: 200 } })
      setEvents(res.data)
    } catch (err) { console.error('Ошибка загрузки событий:', err) }
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

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
  const totalCells = Math.ceil(days.length / 7) * 7
  for (let i = days.length; i < totalCells; i++) {
    const d = i - days.length + 1
    const m = currentMonth === 11 ? 1 : currentMonth + 2
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    days.push({ day: d, month: 'next', date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }

  const getCategoryById = (id) => categories.find(c => c.id === id)

  const getEventsForDate = (dateStr) => {
    const birthdayCat = categories.find(c => c.name === 'Дни рождения')
    return events
      .filter(e => {
        if (e.category === 'birthday') {
          if (birthdayCat && !filter[birthdayCat.id]) return false
          return e.event_date === dateStr
        }
        if (e.is_completed && !filter.done) return false
        if (!filter[e.category_id]) return false
        return e.event_date === dateStr
      })
      .sort((a, b) => {
        if (a.category === 'birthday') return -1
        if (b.category === 'birthday') return 1
        if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
        if (a.start_time) return -1
        if (b.start_time) return 1
        return 0
      })
  }

  const getCategoryStyle = (catId, isCompleted, catName) => {
    if (isCompleted) return 'done'
    if (catName === 'birthday') return 'birthday'
    const cat = getCategoryById(catId)
    return cat ? `cat-${cat.id}` : 'other'
  }

 const canModify = (ev) => {
  if (ev.category === 'birthday') return false
  if (ev.is_completed) return false
  return ev.created_by === user?.id
}

  const monthEvents = events.filter(e => {
    const d = new Date(e.event_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.category !== 'birthday'
  })
  const doneCount = monthEvents.filter(e => e.is_completed).length
  const plannedCount = monthEvents.filter(e => !e.is_completed).length
  const todayStr = today.toISOString().split('T')[0]
  const todayEvents = events.filter(e => e.event_date === todayStr)
  const birthdays = events.filter(e => e.category === 'birthday' && new Date(e.event_date).getMonth() === currentMonth)

  const openModal = (date, event = null) => {
    setSelectedDate(date)
    if (event) {
      if (!canModify(event)) {
        setInfoModal({ isOpen: true, title: 'Невозможно', message: 'Это событие нельзя редактировать' })
        return
      }
      setEditEventId(event.id)
      setTaskTitle(event.title || '')
      setTaskDesc(event.description || '')
      setTaskTime(event.start_time?.slice(0,5) || '09:00')
      setTaskCategory(event.category_id || '')
      setTaskVisibility(event.visibility || 'private')
      setTaskRecurrence(event.recurrence_type || '')
      setTaskRecurrenceEnd(event.recurrence_end_date || '')
    } else {
      setEditEventId(null)
      setTaskTitle('')
      setTaskDesc('')
      setTaskTime('09:00')
      setTaskVisibility('private')
      setTaskRecurrence('')
      setTaskRecurrenceEnd('')
    }
    setIsModalOpen(true)
  }

  const saveEvent = async () => {
    if (!taskTitle.trim()) return
    try {
      const payload = {
        title: taskTitle,
        event_date: selectedDate,
        start_time: taskTime || null,
        category_id: taskCategory,
        description: taskDesc || '',
        visibility: taskVisibility,
        event_type: 'OTHER',
        is_recurring: taskRecurrence !== '',
        recurrence_type: taskRecurrence || null,
        recurrence_end_date: taskRecurrenceEnd || null,
      }
      if (editEventId) {
        await api.put(`/events/${editEventId}`, payload)
      } else {
        await api.post('/events/', payload)
      }
      setIsModalOpen(false)
      setEditEventId(null)
      setTaskRecurrence('')
      setTaskRecurrenceEnd('')
    } catch (err) {
      console.error('Ошибка сохранения события:', err)
      setInfoModal({ isOpen: true, title: 'Ошибка', message: 'Не удалось сохранить событие' })
    }
  }

  const deleteEvent = (eventId) => {
    const ev = events.find(e => e.id === eventId)
    if (ev && !canModify(ev)) {
      setInfoModal({ isOpen: true, title: 'Невозможно', message: 'Это событие нельзя удалить' })
      return
    }
    setInfoModal({
      isOpen: true,
      title: 'Удаление события',
      message: 'Вы уверены, что хотите удалить это событие?',
      onConfirm: async () => {
        try {
          await api.delete(`/events/${eventId}`)
          fetchEvents()
        } catch (err) { console.error('Ошибка удаления события:', err) }
        setInfoModal({ isOpen: false })
      }
    })
  }

  const handleDragStart = (e, event) => {
    if (!canModify(event)) {
      e.preventDefault()
      return
    }
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, dateStr) => {
    e.preventDefault()
    if (draggedEvent && draggedEvent.event_date !== dateStr) {
      if (!canModify(draggedEvent)) {
        setInfoModal({ isOpen: true, title: 'Невозможно', message: 'Это событие нельзя переместить' })
        setDraggedEvent(null)
        return
      }
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

        <div className="weekdays-row"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>

        <div className="days-grid-5">
          {days.map((d, i) => {
            const dayEvents = getEventsForDate(d.date)
            const isToday = d.date === todayStr
            return (
              <div key={i} className={`day-cell ${d.month !== 'current' ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onDoubleClick={() => d.month === 'current' && openModal(d.date)}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, d.date)}>
                <div className="day-number">{d.day}{dayEvents.length > 0 && <span className="task-count">({dayEvents.length})</span>}</div>
                {dayEvents.map(ev => {
                  const isNew = new Date(ev.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
                  const catInfo = getCategoryById(ev.category_id)
                  const modify = canModify(ev)
                  return (
                    <div
                      key={ev.id}
                      className={`task-chip ${getCategoryStyle(ev.category_id, ev.is_completed, ev.category)}`}
                      draggable={modify}
                      onDragStart={(e) => handleDragStart(e, ev)}
                      onClick={() => ev.category !== 'birthday' && toggleComplete(ev)}
                      onDoubleClick={(e) => { e.stopPropagation(); openModal(ev.event_date, ev) }}
                      title={ev.title}
                      style={!ev.is_completed && catInfo ? { borderLeftColor: catInfo.color } : {}}
                    >
                      {isNew && !ev.is_completed && ev.category !== 'birthday' && (
                        <span className="bell-icon" style={{ color: catInfo?.color || '#5b8cff' }}>🔔</span>
                      )}
                      {ev.start_time && <span className="task-time">{ev.start_time?.slice(0,5)}</span>}
                      <span className="task-label">{ev.title}</span>
                      {ev.is_completed && <span className="check-icon">✓</span>}
                      {modify && (
                        <span className="delete-event-btn" onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }}>✕</span>
                      )}
                      <div className="tooltip">
                        <div className="tooltip-title">{ev.title}</div>
                        {ev.description && <div className="tooltip-desc">{ev.description}</div>}
                        <div className="tooltip-meta">
                          {ev.start_time && <span>🕐 {ev.start_time?.slice(0,5)}</span>}
                          <span>🏷️ {catInfo?.name || ev.category}</span>
                          {ev.is_completed && <span>✅ Выполнено</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
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
            <h3>{editEventId ? 'Редактировать событие' : 'Новое событие'}</h3>
            <div className="form-group"><label>Название</label><input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Введите название..." /></div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}><label>Дата</label><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
              <div className="form-group" style={{ flex: 1 }}><label>Время</label><input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} /></div>
            </div>
            <div className="form-group"><label>Категория</label><select value={taskCategory} onChange={e => setTaskCategory(e.target.value)}>{categories.filter(c => c.name !== 'Дни рождения').map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div>
            <div className="form-group">
              <label>Видимость</label>
              <select value={taskVisibility} onChange={e => setTaskVisibility(e.target.value)}>
                <option value="private">Только я</option>
                {userRole === 2 && <option value="groups">Мои группы</option>}
                {(userRole === 1 || userRole === 2) && <option value="all_curators">Все кураторы</option>}
                {userRole === 1 && <option value="budget_curators">Кураторы бюджетных групп</option>}
                {userRole === 1 && <option value="paid_curators">Кураторы платных групп</option>}
                {userRole === 1 && <option value="all">Все</option>}
              </select>
            </div>
            <div className="form-group"><label>Описание</label><textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Дополнительная информация..." rows={2} /></div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}><label>Повторять</label><select value={taskRecurrence} onChange={e => setTaskRecurrence(e.target.value)}><option value="">Не повторять</option><option value="WEEKLY">Еженедельно</option><option value="MONTHLY">Ежемесячно</option></select></div>
              {taskRecurrence && <div className="form-group" style={{ flex: 1 }}><label>До даты</label><input type="date" value={taskRecurrenceEnd} onChange={e => setTaskRecurrenceEnd(e.target.value)} /></div>}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button className="btn-save" onClick={saveEvent}>{editEventId ? 'Сохранить' : 'Добавить'}</button>
            </div>
          </div>
        </div>
      )}

      {infoModal.isOpen && (
        <div className="modal-overlay active" onClick={() => setInfoModal({ isOpen: false })}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '380px' }}>
            <h3>{infoModal.title}</h3>
            <p style={{ margin: '16px 0', color: '#5a6475', fontSize: '14px' }}>{infoModal.message}</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              {infoModal.onConfirm ? (
                <>
                  <button className="btn-cancel" onClick={() => setInfoModal({ isOpen: false })}>Нет</button>
                  <button className="btn-save" onClick={infoModal.onConfirm}>Да</button>
                </>
              ) : (
                <button className="btn-save" onClick={() => setInfoModal({ isOpen: false })}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarPage