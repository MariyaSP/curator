// frontend/src/pages/admin/AdminReferences.jsx
import React, { useState, useEffect, useRef } from 'react'
import api from '../../api/client'
import editIcon from '../../assets/icons/edit.png'
import './AdminReferences.css'

const TABS = [
  { key: 'social-statuses', label: 'Социальные статусы', icon: '👥' },
  { key: 'health-groups', label: 'Группы здоровья', icon: '🏥' },
  { key: 'document-types', label: 'Типы документов', icon: '📄' },
  { key: 'event-categories', label: 'Категории событий', icon: '📅' },
  { key: 'specialties', label: 'Специальности', icon: '🎓' },
  { key: 'academic-years', label: 'Учебные года', icon: '📆' },
]

const AUDIENCES = [
  { value: 'all', label: 'Все' },
  { value: 'all_curators', label: 'Все кураторы' },
  { value: 'budget_curators', label: 'Кураторы бюджетных групп' },
  { value: 'paid_curators', label: 'Кураторы платных групп' },
  { value: 'groups', label: 'Студенты группы куратора и автор' },
  { value: 'private', label: 'Только автор' },
]

const AdminReferences = () => {
  const [activeTab, setActiveTab] = useState('social-statuses')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('#112336')
  const [editAudience, setEditAudience] = useState('all')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#112336')
  const [newAudience, setNewAudience] = useState('all')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [addError, setAddError] = useState('')
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  const fileInputRef = useRef(null)

  const tab = TABS.find(t => t.key === activeTab)
  const hasColor = activeTab === 'event-categories'
  const hasAudience = activeTab === 'event-categories'
  const hasDates = activeTab === 'academic-years'
  const isHealthGroups = activeTab === 'health-groups'

  useEffect(() => { fetchItems() }, [activeTab])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/references/${activeTab}`)
      let data = res.data.map(item => ({
        ...item,
        is_active: activeTab === 'document-types' ? true : item.is_active
      }))
      
      if (activeTab === 'event-categories') {
        data = data.filter(item => item.name !== 'Дни рождения')
      }
      
      setItems(data)
    } catch (err) {
      console.error('Ошибка загрузки:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU')
  }

  const addItem = async () => {
    if (!newName.trim()) {
      setAddError('Введите название')
      return
    }
    
    if (hasDates) {
      if (!newStartDate || !newEndDate) {
        setAddError('Укажите даты начала и окончания')
        return
      }
      if (newEndDate <= newStartDate) {
        setAddError('Дата окончания должна быть позже даты начала')
        return
      }
    }
    
    setAddError('')
    try {
      let url = `/references/${activeTab}?name=${encodeURIComponent(newName)}&is_active=true`
      if (hasColor) url += `&color=${encodeURIComponent(newColor)}`
      if (hasAudience) url += `&audience=${encodeURIComponent(newAudience)}`
      if (hasDates) url += `&start_date=${encodeURIComponent(newStartDate)}&end_date=${encodeURIComponent(newEndDate)}`
      await api.post(url)
      setNewName('')
      setNewColor('#112336')
      setNewAudience('all')
      setNewStartDate('')
      setNewEndDate('')
      setShowAdd(false)
      fetchItems()
    } catch (err) {
      const msg = err.response?.status === 400 ? 'Запись с таким названием уже существует' : 'Не удалось добавить запись'
      setModal({ isOpen: true, title: 'Ошибка', message: msg })
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await api.post('/references/specialties/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      let message = res.data.message
      if (res.data.errors && res.data.errors.length > 0) {
        message += '\n\n' + res.data.errors.join('\n')
      }
      
      setModal({
        isOpen: true,
        title: 'Импорт завершён',
        message: message
      })
      fetchItems()
    } catch (err) {
      setModal({
        isOpen: true,
        title: 'Ошибка импорта',
        message: err.response?.data?.detail || 'Не удалось импортировать файл'
      })
    }
    
    e.target.value = ''
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditValue(item.name)
    setEditColor(item.color || '#112336')
    setEditAudience(item.audience || 'all')
    setEditStartDate(item.start_date || '')
    setEditEndDate(item.end_date || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
    setEditColor('#112336')
    setEditAudience('all')
    setEditStartDate('')
    setEditEndDate('')
  }

  const confirmEdit = () => {
    if (!editValue.trim()) return
    
    if (hasDates) {
      if (!editStartDate || !editEndDate) {
        setModal({ isOpen: true, title: 'Ошибка', message: 'Укажите даты начала и окончания' })
        return
      }
      if (editEndDate <= editStartDate) {
        setModal({ isOpen: true, title: 'Ошибка', message: 'Дата окончания должна быть позже даты начала' })
        return
      }
    }
    
    const oldItem = items.find(i => i.id === editingId)
    setModal({
      isOpen: true,
      title: 'Сохранение изменений',
      message: `Сохранить изменения для «${oldItem?.name || ''}»?`,
      onConfirm: async () => {
        try {
          let url = `/references/${activeTab}/${editingId}?name=${encodeURIComponent(editValue)}`
          if (hasColor) url += `&color=${encodeURIComponent(editColor)}`
          if (hasAudience) url += `&audience=${encodeURIComponent(editAudience)}`
          if (hasDates) url += `&start_date=${encodeURIComponent(editStartDate)}&end_date=${encodeURIComponent(editEndDate)}`
          await api.put(url)
          cancelEdit()
          fetchItems()
        } catch (err) {
          const msg = err.response?.status === 400 ? 'Запись с таким названием уже существует' : 'Не удалось обновить'
          setModal({ isOpen: true, title: 'Ошибка', message: msg })
        }
        setModal({ isOpen: false })
      }
    })
  }

  const toggleActive = async (id, currentActive, name) => {
    if (!currentActive) {
      try {
        await api.put(`/references/${activeTab}/${id}?is_active=true`)
        fetchItems()
      } catch (err) {
        console.error('Ошибка:', err)
      }
      return
    }
    const messages = {
      'health-groups': `Все студенты с группой «${name}» будут переведены на Основную. Продолжить?`,
      'social-statuses': `Статус «${name}» станет недоступен для выбора. Продолжить?`,
    }
    setModal({
      isOpen: true,
      title: 'Деактивация',
      message: messages[activeTab] || `Запись «${name}» станет неактивной. Продолжить?`,
      onConfirm: async () => {
        try {
          await api.put(`/references/${activeTab}/${id}?is_active=false`)
          fetchItems()
        } catch (err) {
          console.error('Ошибка:', err)
        }
        setModal({ isOpen: false })
      }
    })
  }

  const confirmDelete = (id) => {
    setModal({
      isOpen: true,
      title: 'Удаление записи',
      message: isHealthGroups
        ? 'Все студенты с этой группой будут переведены на Основную. Продолжить?'
        : 'Вы уверены, что хотите удалить эту запись?',
      onConfirm: async () => {
        try {
          await api.delete(`/references/${activeTab}/${id}`)
          fetchItems()
        } catch (err) {
          const msg = err.response?.status === 400
            ? err.response?.data?.detail || 'Невозможно удалить запись'
            : 'Ошибка удаления'
          setModal({ isOpen: true, title: 'Ошибка', message: msg })
        }
        setModal({ isOpen: false })
      }
    })
  }

  const isDefault = (item) => isHealthGroups && item.id === 1

  const showSwitch = (item) => {
    if (isDefault(item)) return false
    if (activeTab === 'document-types') return false
    return true
  }

  const audienceLabel = (value) => {
    const found = AUDIENCES.find(a => a.value === value)
    return found ? found.label : value
  }

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="refs-page">
      <div className="refs-sidebar">
        <div className="refs-grid">
          {TABS.map(t => (
            <div
              key={t.key}
              className={`refs-card ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(t.key)
                setSearch('')
                setShowAdd(false)
                cancelEdit()
              }}
            >
              <span className="refs-card-icon">{t.icon}</span>
              <div className="refs-card-info">
                <span className="refs-card-label">{t.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="refs-content">
        <div className="refs-content-header">
          <h3>{tab?.icon} {tab?.label}</h3>
          <div className="refs-header-right">
            {activeTab === 'specialties' && (
              <>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                <button
                  className="refs-import-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📥 Импорт Excel
                </button>
              </>
            )}
            <input
              type="text"
              placeholder="🔍 Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="refs-search-input"
            />
            <button
              className="refs-add-btn"
              onClick={() => {
                setShowAdd(true)
                setAddError('')
              }}
            >
              + Добавить
            </button>
          </div>
        </div>

        {loading ? (
          <div className="refs-loading">Загрузка...</div>
        ) : (
          <div className="refs-items">
            {showAdd && (
              <div className="refs-item-new">
                <div className="refs-input-wrapper">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => {
                      setNewName(e.target.value)
                      setAddError('')
                    }}
                    placeholder="Введите название..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') addItem()
                      if (e.key === 'Escape') setShowAdd(false)
                    }}
                    className={`refs-add-input ${addError ? 'error' : ''}`}
                  />
                  {addError && <span className="refs-error-inline">{addError}</span>}
                </div>
                {hasColor && (
                  <input
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className="refs-color-picker"
                  />
                )}
                {hasAudience && (
                  <select
                    value={newAudience}
                    onChange={e => setNewAudience(e.target.value)}
                    className="refs-audience-select"
                  >
                    {AUDIENCES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                )}
                {hasDates && (
                  <>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={e => setNewStartDate(e.target.value)}
                      className="refs-date-input"
                    />
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={e => setNewEndDate(e.target.value)}
                      className="refs-date-input"
                    />
                  </>
                )}
                <button className="refs-check-btn" onClick={addItem}>✓</button>
                <button className="refs-close-btn" onClick={() => setShowAdd(false)}>✕</button>
              </div>
            )}

            {filtered.map(item => (
              <div key={item.id} className={`refs-item ${!item.is_active ? 'inactive' : ''}`}>
                {hasColor && <span className="refs-color-dot" style={{ background: item.color }}></span>}

                {editingId === item.id ? (
                  <>
                    <div className="refs-input-wrapper">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="refs-edit-input"
                      />
                    </div>
                    {hasColor && (
                      <input
                        type="color"
                        value={editColor}
                        onChange={e => setEditColor(e.target.value)}
                        className="refs-color-picker"
                      />
                    )}
                    {hasAudience && (
                      <select
                        value={editAudience}
                        onChange={e => setEditAudience(e.target.value)}
                        className="refs-audience-select"
                      >
                        {AUDIENCES.map(a => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    )}
                    {hasDates && (
                      <>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="refs-date-input"
                        />
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="refs-date-input"
                        />
                      </>
                    )}
                    <button className="refs-check-btn" onClick={confirmEdit}>✓</button>
                    <button className="refs-close-btn" onClick={cancelEdit}>✕</button>
                  </>
                ) : (
                  <span
                    className="refs-item-name"
                    onDoubleClick={() => startEdit(item)}
                  >
                    {item.name}
                    {hasDates && item.start_date && item.end_date && (
                      <span className="refs-dates-badge">
                        {formatDate(item.start_date)} — {formatDate(item.end_date)}
                      </span>
                    )}
                    {isDefault(item) && <span className="refs-default-badge">по умолчанию</span>}
                    {hasAudience && item.audience && (
                      <span className="refs-audience-badge">{audienceLabel(item.audience)}</span>
                    )}
                  </span>
                )}

                <div className="refs-item-actions">
                  {showSwitch(item) && (
                    <label className="refs-switch">
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        onChange={() => toggleActive(item.id, item.is_active, item.name)}
                      />
                      <span className="refs-switch-slider"></span>
                    </label>
                  )}
                  {!isDefault(item) && editingId !== item.id && (
                    <>
                      <button className="refs-icon-btn" onClick={() => startEdit(item)}>
                        <img src={editIcon} alt="Редактировать" className="refs-icon-img" />
                      </button>
                      <button className="refs-icon-btn danger" onClick={() => confirmDelete(item.id)}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && !showAdd && (
              <div className="refs-empty">Нет данных</div>
            )}
          </div>
        )}
      </div>

      {modal.isOpen && (
        <div className="modal-overlay" onClick={() => setModal({ isOpen: false })}>
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
          >
            <h3>{modal.title}</h3>
            <p className="modal-message">{modal.message}</p>
            <div className="modal-actions">
              {modal.onConfirm ? (
                <>
                  <button className="btn-save" onClick={modal.onConfirm}>Да</button>
                  <button className="btn-cancel" onClick={() => setModal({ isOpen: false })}>Нет</button>
                </>
              ) : (
                <button className="btn-save" onClick={() => setModal({ isOpen: false })}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReferences