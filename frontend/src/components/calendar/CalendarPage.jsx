// frontend/src/components/calendar/CalendarPage.jsx
import React, { useState, useEffect, useRef } from 'react'
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
  const [selectedAudiences, setSelectedAudiences] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [filter, setFilter] = useState({})
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [taskRecurrence, setTaskRecurrence] = useState('')
  const [taskRecurrenceEnd, setTaskRecurrenceEnd] = useState('')
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [formErrors, setFormErrors] = useState({})
  
  const [popupEvent, setPopupEvent] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  
  const [activeTab, setActiveTab] = useState('calendar')
  const [selectedEventForStats, setSelectedEventForStats] = useState(null)
  const [statsData, setStatsData] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsTab, setStatsTab] = useState('completed')
  const [statsSearch, setStatsSearch] = useState('')
  const [statsRoleFilter, setStatsRoleFilter] = useState('all')
  const [statsGroupFilter, setStatsGroupFilter] = useState('all')
  
  const dropdownRef = useRef(null)
  const popupRef = useRef(null)

  const audienceOptions = [
    { value: 'all', label: 'Все' },
    { value: 'all_teachers', label: 'Педагоги (включая кураторов)' },
    { value: 'budget_curators', label: 'Кураторы бюджета' },
    { value: 'paid_curators', label: 'Кураторы коммерции' },
    { value: 'budget_students', label: 'Студенты бюджета' },
    { value: 'paid_students', label: 'Студенты коммерции' },
  ]

  const getAudienceOptionsForCategory = (categoryId) => {
    const category = categories.find(c => c.id === Number(categoryId))
    if (!category) return audienceOptions
    
    const categoryName = category.name.toLowerCase()
    
    if (categoryName.includes('отчет') || categoryName.includes('отчёт')) {
      return [
        { value: 'all_teachers', label: 'Педагоги (включая кураторов)' },
        { value: 'budget_curators', label: 'Кураторы бюджета' },
        { value: 'paid_curators', label: 'Кураторы коммерции' },
      ]
    }
    
    if (categoryName.includes('студент')) {
      return [
        { value: 'budget_students', label: 'Студенты бюджета' },
        { value: 'paid_students', label: 'Студенты коммерции' },
      ]
    }
    
    if (categoryName.includes('педагог')) {
      return [
        { value: 'all_teachers', label: 'Педагоги (включая кураторов)' },
      ]
    }
    
    return audienceOptions
  }

  const shouldShowStatsButton = (ev) => {
    if (ev.category === 'birthday') return false
    if (ev.created_by !== user?.id) return false
    
    const vis = Array.isArray(ev.visibility) ? ev.visibility : [ev.visibility]
    if (vis.length === 1 && vis[0] === 'private') return false
    
    return true
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setPopupEvent(null)
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setPopupEvent(null)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [])

  useEffect(() => {
    let ws = null
    let reconnectTimer = null
    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws/events')
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
      let cats = res.data || []

      // Студент видит только категории "all"
      if (userRole === 3) {
        cats = cats.filter(c => c.audience === 'all')
      }
      // Куратор и админ видят все категории

      setCategories(cats)
      const initialFilter = {}
      cats.forEach(cat => { initialFilter[cat.id] = true })
      initialFilter['done'] = true
      setFilter(initialFilter)
      if (cats.length > 0) {
        const firstNonBirthday = cats.find(c => c.name !== 'Дни рождения')
        setTaskCategory(firstNonBirthday ? firstNonBirthday.id : cats[0].id)
      }
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err)
    }
  }

  useEffect(() => { if (categories.length > 0) fetchEvents() }, [currentMonth, currentYear, categories])

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/', { params: { month: currentMonth + 1, year: currentYear, limit: 500 } })
      setEvents(res.data)
    } catch (err) {
      console.error('Ошибка загрузки событий:', err)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
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
    days.push({ day: d, month: 'prev', date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, month: 'current', date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` })
  }
  
  const totalCells = Math.ceil(days.length / 7) * 7
  const nextMonthDayCount = totalCells - days.length
  for (let i = 1; i <= nextMonthDayCount; i++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    days.push({ day: i, month: 'next', date: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}` })
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
        if (e.is_completed_by_current_user && !filter.done) return false
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
    return ev.created_by === user?.id
  }

  const monthEvents = events.filter(e => {
    const d = new Date(e.event_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.category !== 'birthday'
  })
  const doneCount = monthEvents.filter(e => e.is_completed_by_current_user).length
  const plannedCount = monthEvents.filter(e => !e.is_completed_by_current_user).length
  const todayStr = today.toISOString().split('T')[0]
  const todayEvents = events.filter(e => e.event_date === todayStr)
  const birthdays = userRole !== 1 
    ? events.filter(e => e.category === 'birthday' && new Date(e.event_date).getMonth() === currentMonth)
    : []

  const openStatsTab = async (ev) => {
    setSelectedEventForStats(ev)
    setActiveTab('stats')
    setStatsLoading(true)
    setStatsData(null)
    setStatsTab('completed')
    setStatsSearch('')
    setStatsRoleFilter('all')
    setStatsGroupFilter('all')
    
    try {
      const res = await api.get(`/events/${ev.id}/completion-status`)
      setStatsData(res.data)
      setStatsLoading(false)
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err)
      setStatsLoading(false)
      setActiveTab('calendar')
      setSelectedEventForStats(null)
      setInfoModal({ isOpen: true, title: 'Ошибка', message: 'Не удалось загрузить статистику' })
    }
  }

  const backToCalendar = () => {
    setActiveTab('calendar')
    setSelectedEventForStats(null)
    setStatsData(null)
    setStatsSearch('')
    setStatsRoleFilter('all')
    setStatsGroupFilter('all')
  }

  const openPopup = (e, ev) => {
    e.stopPropagation()
    if (ev.category === 'birthday') return
    
    const x = Math.min(e.clientX, window.innerWidth - 180)
    const y = Math.min(e.clientY, window.innerHeight - 180)
    
    setPopupEvent(ev)
    setPopupPosition({ x, y })
  }

  const closePopup = () => {
    setPopupEvent(null)
  }

  const handleEditFromPopup = () => {
    const ev = popupEvent
    closePopup()
    openModal(ev.event_date, ev)
  }

  const handleCompleteFromPopup = async () => {
    const ev = popupEvent
    closePopup()
    await toggleComplete(ev)
  }

  const handleStatsFromPopup = () => {
    const ev = popupEvent
    closePopup()
    openStatsTab(ev)
  }

  const openModal = (date, event = null) => {
    setSelectedDate(date)
    setFormErrors({})
    setIsDropdownOpen(false)
    if (event) {
      if (!canModify(event)) {
        setInfoModal({ isOpen: true, title: 'Невозможно', message: 'Это событие нельзя редактировать' })
        return
      }
      setEditEventId(event.id)
      setTaskTitle(event.title || '')
      setTaskDesc(event.description || '')
      setTaskTime(event.start_time?.slice(0, 5) || '09:00')
      setTaskCategory(event.category_id || '')
      if (Array.isArray(event.visibility)) {
        setSelectedAudiences(event.visibility)
      } else if (event.visibility) {
        setSelectedAudiences([event.visibility])
      } else {
        setSelectedAudiences([])
      }
      
      if (event.recurrence_type) {
        setTaskRecurrence(event.recurrence_type.toUpperCase())
      } else {
        setTaskRecurrence('')
      }
      
      setTaskRecurrenceEnd(event.recurrence_end_date || '')
    } else {
      setEditEventId(null)
      setTaskTitle('')
      setTaskDesc('')
      setTaskTime('09:00')
      if (userRole === 1) {
        setSelectedAudiences(['all'])
      } else {
        setSelectedAudiences([])
      }
      setTaskRecurrence('')
      setTaskRecurrenceEnd('')
    }
    setIsModalOpen(true)
  }

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value
    setTaskCategory(categoryId)
    setFormErrors(prev => ({ ...prev, category: null }))
    
    if (categoryId && userRole === 1) {
      const category = categories.find(c => c.id === Number(categoryId))
      if (category) {
        const categoryName = category.name.toLowerCase()
        
        if (categoryName.includes('отчет') || categoryName.includes('отчёт')) {
          setSelectedAudiences(['all_teachers'])
        } else if (categoryName.includes('студент')) {
          setSelectedAudiences(['budget_students', 'paid_students'])
        } else if (categoryName.includes('педагог')) {
          setSelectedAudiences(['all_teachers'])
        } else {
          setSelectedAudiences(['all'])
        }
      }
    }
  }

  const handleAudienceToggle = (value) => {
    if (value === 'all') {
      setSelectedAudiences(prev => 
        prev.includes('all') ? [] : ['all']
      )
    } else if (value === 'all_teachers') {
      setSelectedAudiences(prev => {
        let next = [...prev]
        next = next.filter(a => a !== 'all')
        if (next.includes('all_teachers')) {
          next = next.filter(a => a !== 'all_teachers')
        } else {
          next = next.filter(a => a !== 'budget_curators' && a !== 'paid_curators')
          next.push('all_teachers')
        }
        return next
      })
    } else if (value === 'budget_curators' || value === 'paid_curators') {
      setSelectedAudiences(prev => {
        let next = [...prev]
        next = next.filter(a => a !== 'all' && a !== 'all_teachers')
        if (next.includes(value)) {
          next = next.filter(a => a !== value)
        } else {
          next.push(value)
        }
        return next
      })
    } else {
      setSelectedAudiences(prev => {
        let next = [...prev]
        next = next.filter(a => a !== 'all')
        if (next.includes(value)) {
          next = next.filter(a => a !== value)
        } else {
          next.push(value)
        }
        return next
      })
    }
    setFormErrors(prev => ({ ...prev, audiences: null }))
  }

  const getSelectedLabels = () => {
    if (selectedAudiences.length === 0) return 'Выберите аудиторию...'
    if (selectedAudiences.includes('all')) return 'Все'
    return selectedAudiences
      .map(val => audienceOptions.find(opt => opt.value === val)?.label)
      .filter(Boolean)
      .join(', ')
  }

  const validateForm = () => {
    const errors = {}
    
    if (!taskTitle.trim()) {
      errors.title = 'Введите название события'
    }
    
    if (!selectedDate) {
      errors.date = 'Выберите дату события'
    }
    
    if (!taskCategory) {
      errors.category = 'Выберите категорию события'
    }
    
    if (userRole === 1 && selectedAudiences.length === 0) {
      errors.audiences = 'Выберите хотя бы одну аудиторию'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveEvent = async () => {
    if (!validateForm()) {
      return
    }

    const payload = {
      title: taskTitle,
      event_date: selectedDate,
      start_time: taskTime || null,
      category_id: taskCategory,
      description: taskDesc || '',
      visibility: selectedAudiences,
      event_type: 'OTHER',
      is_recurring: taskRecurrence !== '',
      recurrence_type: taskRecurrence || null,
      recurrence_end_date: taskRecurrenceEnd || null,
    }

    try {
      if (editEventId) {
        await api.put(`/events/${editEventId}`, payload)
      } else {
        await api.post('/events/', payload)
      }
      
      await fetchEvents()
      
      setIsModalOpen(false)
      setEditEventId(null)
      setTaskRecurrence('')
      setTaskRecurrenceEnd('')
      setSelectedAudiences([])
      setFormErrors({})
      setIsDropdownOpen(false)
    } catch (err) {
      console.error('Ошибка сохранения:', err)
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
          await fetchEvents()
        } catch (err) {
          console.error('Ошибка удаления события:', err)
        }
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
        await fetchEvents()
      } catch (err) {
        console.error('Ошибка перемещения события:', err)
      }
    }
    setDraggedEvent(null)
  }

  const toggleComplete = async (event) => {
    if (event.category === 'birthday') return
    try {
      await api.post(`/events/${event.id}/complete`)
      await fetchEvents()
    } catch (err) {
      console.error('Ошибка обновления события:', err)
    }
  }

  const getRoleLabel = (role) => {
    switch(role) {
      case 1: return 'Администратор'
      case 2: return 'Куратор'
      case 3: return 'Студент'
      default: return 'Пользователь'
    }
  }

  const getGroupTypeLabel = (groupType) => {
    switch(groupType) {
      case 'budget': return 'Бюджет'
      case 'paid': return 'Коммерция'
      default: return '—'
    }
  }

  const getFilteredStatsUsers = (users) => {
    return users.filter(u => {
      if (statsSearch && !u.full_name.toLowerCase().includes(statsSearch.toLowerCase())) {
        return false
      }
      if (statsRoleFilter !== 'all' && String(u.role) !== statsRoleFilter) {
        return false
      }
      if (statsGroupFilter !== 'all' && u.group_type !== statsGroupFilter) {
        return false
      }
      return true
    })
  }

  return (
    <div className="calendar-dashboard">
      {/* ===== ТАБЫ ===== */}
      <div className="calendar-tabs">
        <button 
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={backToCalendar}
        >
          📅 Календарь
        </button>
        {activeTab === 'stats' && selectedEventForStats && (
          <button 
            className="tab-btn active"
          >
            📊 {selectedEventForStats.title}
          </button>
        )}
      </div>

      {/* ===== СОДЕРЖИМОЕ ===== */}
      <div className="calendar-body">
        {activeTab === 'calendar' ? (
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
                  <div
                    key={i}
                    className={`day-cell ${d.month !== 'current' ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    onDoubleClick={() => d.month === 'current' && openModal(d.date)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, d.date)}
                  >
                    <div className="day-number">{d.day}{dayEvents.length > 0 && <span className="task-count">({dayEvents.length})</span>}</div>
                    {dayEvents.map(ev => {
                      const isNew = new Date(ev.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
                      const catInfo = getCategoryById(ev.category_id)
                      const modify = canModify(ev)
                      const isDone = ev.is_completed_by_current_user
                      return (
                        <div
                          key={ev.id}
                          className={`task-chip ${getCategoryStyle(ev.category_id, isDone, ev.category)}`}
                          draggable={modify}
                          onDragStart={(e) => handleDragStart(e, ev)}
                          onClick={(e) => openPopup(e, ev)}
                          title={ev.title}
                          style={!isDone && catInfo ? { borderLeftColor: catInfo.color } : {}}
                        >
                          {isNew && !isDone && ev.category !== 'birthday' && (
                            <span className="bell-icon" style={{ color: catInfo?.color || '#5b8cff' }}>🔔</span>
                          )}
                          {ev.start_time && <span className="task-time">{ev.start_time?.slice(0, 5)}</span>}
                          <span className="task-label">{ev.title}</span>
                          {isDone && <span className="check-icon">✓</span>}
                          {modify && (
                            <span
                              className="delete-event-btn"
                              onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }}
                            >
                              ✕
                            </span>
                          )}
                          <div className="tooltip">
                            <div className="tooltip-title">{ev.title}</div>
                            {ev.description && <div className="tooltip-desc">{ev.description}</div>}
                            <div className="tooltip-meta">
                              {ev.start_time && <span>🕐 {ev.start_time?.slice(0, 5)}</span>}
                              <span>🏷️ {catInfo?.name || ev.category}</span>
                              {isDone && <span>✅ Выполнено</span>}
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
        ) : (
          <main className="stats-main">
            <button className="back-btn" onClick={backToCalendar}>← Назад к календарю</button>
            
            {statsLoading ? (
              <div className="stats-loading">Загрузка статистики...</div>
            ) : statsData ? (
              <>
                <div className="stats-event-header">
                  <h2>{statsData.event_title}</h2>
                  <div className="stats-event-date">{statsData.event_date}</div>
                </div>
                
                <div className="stats-counts">
                  <span className="stats-count-completed">✅ {statsData.completed_count} отметили</span>
                  <span className="stats-count-pending">⏳ {statsData.not_completed_count} не отметили</span>
                  <span className="stats-count-total">👥 Всего: {statsData.total_audience}</span>
                </div>
                
                <div className="stats-tabs">
                  <button 
                    className={`stats-tab ${statsTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setStatsTab('completed')}
                  >
                    ✅ Отметили ({statsData.completed_count})
                  </button>
                  <button 
                    className={`stats-tab ${statsTab === 'not_completed' ? 'active' : ''}`}
                    onClick={() => setStatsTab('not_completed')}
                  >
                    ⏳ Не отметили ({statsData.not_completed_count})
                  </button>
                </div>
                
                <div className="stats-filters">
                  <input 
                    type="text" 
                    placeholder="🔍 Поиск по имени..." 
                    value={statsSearch}
                    onChange={e => setStatsSearch(e.target.value)}
                    className="stats-search-input"
                  />
                  <select 
                    value={statsRoleFilter} 
                    onChange={e => setStatsRoleFilter(e.target.value)}
                    className="stats-filter-select"
                  >
                    <option value="all">Все роли</option>
                    <option value="2">Кураторы</option>
                    <option value="3">Студенты</option>
                  </select>
                  <select 
                    value={statsGroupFilter} 
                    onChange={e => setStatsGroupFilter(e.target.value)}
                    className="stats-filter-select"
                  >
                    <option value="all">Все группы</option>
                    <option value="budget">Бюджет</option>
                    <option value="paid">Коммерция</option>
                  </select>
                </div>
                
                <div className="stats-user-list">
                  {statsTab === 'completed' ? (
                    getFilteredStatsUsers(statsData.completed).length > 0 ? (
                      getFilteredStatsUsers(statsData.completed).map(u => (
                        <div key={u.user_id} className="stats-user-item">
                          <span className="stats-user-name">{u.full_name}</span>
                          <span className={`stats-user-role role-${u.role}`}>{getRoleLabel(u.role)}</span>
                          <span className={`stats-user-group group-${u.group_type || 'none'}`}>
                            {getGroupTypeLabel(u.group_type)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-text">Никто не отметил или нет совпадений</div>
                    )
                  ) : (
                    getFilteredStatsUsers(statsData.not_completed).length > 0 ? (
                      getFilteredStatsUsers(statsData.not_completed).map(u => (
                        <div key={u.user_id} className="stats-user-item">
                          <span className="stats-user-name">{u.full_name}</span>
                          <span className={`stats-user-role role-${u.role}`}>{getRoleLabel(u.role)}</span>
                          <span className={`stats-user-group group-${u.group_type || 'none'}`}>
                            {getGroupTypeLabel(u.group_type)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-text">Все отметили или нет совпадений</div>
                    )
                  )}
                </div>
              </>
            ) : null}
          </main>
        )}

        {/* ===== БОКОВАЯ ПАНЕЛЬ ===== */}
        <aside className="calendar-sidebar">
          <div className="side-card">
            <div className='side-card-title'>
              <img src={chartIcon} alt="Статистика" className="side-card-icon" />
              <h4> Статистика за месяц</h4>
            </div>
            <div className="stats-grid">
              <div className="stat-block"><span className="stat-number green">{doneCount}</span><span className="stat-label">Выполнено</span></div>
              <div className="stat-block"><span className="stat-number blue">{plannedCount}</span><span className="stat-label">Запланировано</span></div>
              <div className="stat-block"><span className="stat-number orange">0</span><span className="stat-label">Просрочено</span></div>
            </div>
          </div>

          {userRole !== 1 && (
            <div className="side-card">
              <div className='side-card-title'>
                <img src={bdIcon} alt="Дни рождения" className="side-card-icon" />
                <h4> Дни рождения</h4>
              </div>
              {birthdays.slice(0, 4).map(ev => (
                <div key={ev.id} className="birthday-row">
                  <div className="birthday-avatar">{new Date(ev.event_date).getDate()}</div>
                  <span className="birthday-name">{ev.title?.replace('ДР — ', '')}</span>
                </div>
              ))}
              {birthdays.length === 0 && <div className="empty-text">Нет дней рождений</div>}
            </div>
          )}

          <div className="side-card">
            <div className='side-card-title'>
              <img src={taskIcon} alt="Задачи на сегодня" className="side-card-icon" />
              <h4> Задачи на сегодня</h4>
            </div>
            {todayEvents.length > 0 ? todayEvents.map(ev => (
              <div key={ev.id} className={`today-task ${ev.is_completed_by_current_user ? 'done' : ''}`}>
                {ev.start_time && <span className="today-time">{ev.start_time?.slice(0, 5)}</span>}
                <span className="today-text" style={ev.is_completed_by_current_user ? { textDecoration: 'line-through' } : {}}>{ev.title}</span>
                <span className={`task-tag ${getCategoryStyle(ev.category_id, ev.is_completed_by_current_user, ev.category)}`}>
                  {ev.is_completed_by_current_user ? 'Выполнено' : getCategoryById(ev.category_id)?.name || ev.category}
                </span>
              </div>
            )) : <div className="empty-text">Нет задач на сегодня</div>}
          </div>

          <div className="side-card">
            <div className='side-card-title'>
              <img src={filterIcon} alt="Фильтры" className="side-card-icon" />
              <h4> Фильтр</h4>
            </div>
            {categories
              .filter(cat => userRole !== 1 || cat.name !== 'Дни рождения')
              .map(cat => (
                <label key={cat.id} className={`legend-item ${!filter[cat.id] ? 'muted' : ''}`}>
                  <input
                    type="checkbox"
                    checked={filter[cat.id] || false}
                    onChange={() => setFilter(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  />
                  <span className="legend-dot" style={{ backgroundColor: cat.color }}></span>
                  {cat.name}
                </label>
              ))}
            <label className={`legend-item ${!filter.done ? 'muted' : ''}`}>
              <input
                type="checkbox"
                checked={filter.done || false}
                onChange={() => setFilter(prev => ({ ...prev, done: !prev.done }))}
              />
              <span className="legend-dot" style={{ backgroundColor: '#e8eaed', border: '1px solid #5f6368' }}></span>
              Выполнено
            </label>
          </div>
        </aside>
      </div>

      {/* ПОПАП-МЕНЮ */}
      {popupEvent && activeTab === 'calendar' && (
        <div 
          ref={popupRef}
          className="event-popup"
          style={{ top: popupPosition.y, left: popupPosition.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="event-popup-title">{popupEvent.title}</div>
          <button 
            className="popup-btn popup-btn-edit"
            onClick={handleEditFromPopup}
          >
            📝 Редактировать
          </button>
          <button 
            className={`popup-btn ${popupEvent.is_completed_by_current_user ? 'popup-btn-uncomplete' : 'popup-btn-complete'}`}
            onClick={handleCompleteFromPopup}
          >
            {popupEvent.is_completed_by_current_user ? '↩️ Снять отметку' : '✅ Выполнено'}
          </button>
          {shouldShowStatsButton(popupEvent) && (
            <button 
              className="popup-btn popup-btn-stats"
              onClick={handleStatsFromPopup}
            >
              📊 Статистика
            </button>
          )}
        </div>
      )}

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      {isModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{editEventId ? 'Редактировать событие' : 'Новое событие'}</h3>
            
            <div className={`form-group ${formErrors.title ? 'has-error' : ''}`}>
              <label>Название *</label>
              <input 
                type="text" 
                value={taskTitle} 
                onChange={e => { setTaskTitle(e.target.value); setFormErrors(prev => ({ ...prev, title: null })) }} 
                placeholder="Введите название..." 
              />
              {formErrors.title && <span className="field-error">{formErrors.title}</span>}
            </div>
            
            <div className="form-row">
              <div className={`form-group ${formErrors.date ? 'has-error' : ''}`} style={{ flex: 1 }}>
                <label>Дата *</label>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={e => { setSelectedDate(e.target.value); setFormErrors(prev => ({ ...prev, date: null })) }} 
                />
                {formErrors.date && <span className="field-error">{formErrors.date}</span>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Время</label>
                <input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} />
              </div>
            </div>
            
            <div className={`form-group ${formErrors.category ? 'has-error' : ''}`}>
              <label>Категория *</label>
              <select 
                value={taskCategory} 
                onChange={handleCategoryChange}
              >
                <option value="">Выберите категорию...</option>
                {categories.filter(c => c.name !== 'Дни рождения').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {formErrors.category && <span className="field-error">{formErrors.category}</span>}
            </div>
            
            {userRole === 1 && (
              <div className={`form-group ${formErrors.audiences ? 'has-error' : ''}`}>
                <label>Кому видно: *</label>
                <div className="multi-select-dropdown" ref={dropdownRef}>
                  <div 
                    className="multi-select-header" 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    tabIndex={0}
                    onBlur={(e) => {
                      if (!dropdownRef.current?.contains(e.relatedTarget)) {
                        setIsDropdownOpen(false)
                      }
                    }}
                  >
                    <span className="multi-select-text">{getSelectedLabels()}</span>
                    <span className={`multi-select-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
                  </div>
                  {isDropdownOpen && (
                    <div className="multi-select-options">
                      {getAudienceOptionsForCategory(taskCategory).map(opt => (
                        <label key={opt.value} className="multi-select-option">
                          <input
                            type="checkbox"
                            checked={selectedAudiences.includes(opt.value)}
                            onChange={() => handleAudienceToggle(opt.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {formErrors.audiences && <span className="field-error">{formErrors.audiences}</span>}
              </div>
            )}
            
            {userRole === 2 && (
              <div className="form-group">
                <label>Видимость</label>
                <select value={selectedAudiences[0] || 'private'} onChange={e => setSelectedAudiences([e.target.value])}>
                  <option value="private">Только я</option>
                  <option value="groups">Мои группы</option>
                </select>
              </div>
            )}
            
            {userRole === 3 && (
              <div className="form-group">
                <label>Видимость</label>
                <div>Личные заметки</div>
              </div>
            )}
            
            <div className="form-group">
              <label>Описание</label>
              <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Дополнительная информация..." rows={2} />
            </div>
            
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Повторять</label>
                <select value={taskRecurrence} onChange={e => setTaskRecurrence(e.target.value)}>
                  <option value="">Не повторять</option>
                  <option value="WEEKLY">Еженедельно</option>
                  <option value="MONTHLY">Ежемесячно</option>
                </select>
              </div>
              {taskRecurrence && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label>До даты</label>
                  <input type="date" value={taskRecurrenceEnd} onChange={e => setTaskRecurrenceEnd(e.target.value)} />
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={(e) => { e.preventDefault(); setIsModalOpen(false); }}
              >
                Отмена
              </button>
              <button 
                type="button" 
                className="btn-save" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveEvent(); }}
              >
                {editEventId ? 'Сохранить' : 'Добавить'}
              </button>
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