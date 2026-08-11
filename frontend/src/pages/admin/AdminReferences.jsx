// frontend/src/pages/admin/AdminReferences.jsx
import React, { useState, useEffect } from 'react'
import api from '../../api/client'
import './AdminReferences.css'

const TABS = [
  { key: 'social-statuses', label: 'Социальные статусы', icon: '👥' },
  { key: 'health-groups', label: 'Группы здоровья', icon: '🏥' },
  { key: 'document-types', label: 'Типы документов', icon: '📄' },
  { key: 'event-categories', label: 'Категории событий', icon: '📅' },
  { key: 'specialties', label: 'Специальности', icon: '🎓' },
  { key: 'academic-years', label: 'Учебные года', icon: '📆' },
]

const AdminReferences = () => {
  const [activeTab, setActiveTab] = useState('social-statuses')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#112336')
  const [addError, setAddError] = useState('')
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  const tab = TABS.find(t => t.key === activeTab)
  const hasColor = activeTab === 'event-categories'
  const isHealthGroups = activeTab === 'health-groups'

  useEffect(() => { fetchItems() }, [activeTab])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/references/${activeTab}`)
      setItems(res.data)
    } catch (err) { console.error('Ошибка загрузки:', err) }
    finally { setLoading(false) }
  }

  const addItem = async () => {
    if (!newName.trim()) {
      setAddError('Введите название')
      return
    }
    setAddError('')
    try {
      await api.post(`/references/${activeTab}?name=${encodeURIComponent(newName)}&color=${encodeURIComponent(newColor)}&is_active=true`)
      setNewName('')
      setNewColor('#112336')
      setShowAdd(false)
      fetchItems()
    } catch (err) {
      const msg = err.response?.status === 400 ? 'Запись с таким названием уже существует' : 'Не удалось добавить запись'
      setModal({ isOpen: true, title: 'Ошибка', message: msg })
    }
  }

  const startEdit = (id, name) => {
    setEditingId(id)
    setEditValue(name)
  }

  const saveEdit = async (id) => {
    if (!editValue.trim()) return
    try {
      await api.put(`/references/${activeTab}/${id}?name=${encodeURIComponent(editValue)}`)
      setEditingId(null)
      fetchItems()
    } catch (err) {
      const msg = err.response?.status === 400 ? 'Запись с таким названием уже существует' : 'Не удалось обновить'
      setModal({ isOpen: true, title: 'Ошибка', message: msg })
    }
  }

const toggleActive = (id, currentActive, name) => {
  if (!currentActive) {
    // Активация — без подтверждения
    activateItem(id)
    return
  }
  // Деактивация — с подтверждением
  const messages = {
    'health-groups': `Все студенты с группой «${name}» будут переведены на Основную. Продолжить?`,
    'social-statuses': `Статус «${name}» станет недоступен для выбора. Продолжить?`,
    'document-types': `Тип документа «${name}» станет недоступен. Продолжить?`,
  }
  setModal({
    isOpen: true,
    title: 'Деактивация',
    message: messages[activeTab] || `Запись «${name}» станет неактивной. Продолжить?`,
    onConfirm: async () => {
      try {
        await api.put(`/references/${activeTab}/${id}?is_active=false`)
        fetchItems()
      } catch (err) { console.error('Ошибка:', err) }
      setModal({ isOpen: false })
    }
  })
}

const activateItem = async (id) => {
  try {
    await api.put(`/references/${activeTab}/${id}?is_active=true`)
    fetchItems()
  } catch (err) { console.error('Ошибка:', err) }
}

  const confirmDelete = (id) => {
    setModal({
      isOpen: true,
      title: 'Удаление записи',
      message: isHealthGroups ? 'Все студенты с этой группой будут переведены на Основную. Продолжить?' : 'Вы уверены, что хотите удалить эту запись?',
      onConfirm: async () => {
        try {
          await api.delete(`/references/${activeTab}/${id}`)
          fetchItems()
        } catch (err) { console.error('Ошибка удаления:', err) }
        setModal({ isOpen: false })
      }
    })
  }

  // 🟢 Можно ли изменять/удалять запись
  const isDefault = (item) => isHealthGroups && item.id === 1

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="refs-page">
      <div className="refs-sidebar">
        <div className="refs-grid">
          {TABS.map(t => (
            <div
              key={t.key}
              className={`refs-card ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.key); setSearch(''); setShowAdd(false); setEditingId(null) }}
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
            <input
              type="text"
              placeholder="🔍 Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="refs-search-input"
            />
            <button className="refs-add-btn" onClick={() => { setShowAdd(true); setAddError('') }}>+ Добавить</button>
          </div>
        </div>

        {loading ? (
          <div className="refs-loading">Загрузка...</div>
        ) : (
          <div className="refs-items">
            {showAdd && (
              <div className="refs-item refs-item-new">
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setAddError('') }}
                    placeholder="Введите название..."
                    onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setShowAdd(false) }}
                    className={`refs-add-input ${addError ? 'error' : ''}`}
                  />
                  {addError && <span className="refs-error-inline">{addError}</span>}
                </div>
                {hasColor && (
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="refs-color-picker" />
                )}
                <button className="refs-check-btn" onClick={addItem}>✓</button>
                <button className="refs-close-btn" onClick={() => setShowAdd(false)}>✕</button>
              </div>
            )}
            {filtered.map(item => (
              <div key={item.id} className={`refs-item ${!item.is_active ? 'inactive' : ''}`}>
                {hasColor && <span className="refs-color-dot" style={{ background: item.color }}></span>}
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(item.id)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                    className="refs-edit-input"
                  />
                ) : (
                  <span className="refs-item-name" onDoubleClick={() => startEdit(item.id, item.name)}>
                    {item.name}
                    {isDefault(item) && <span className="refs-default-badge">по умолчанию</span>}
                  </span>
                )}
                <div className="refs-item-actions">
                  {/* 🟢 Скрываем переключатель для основной группы */}
                  {!isDefault(item) && (
                    <label className="refs-switch">
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        onChange={() => toggleActive(item.id, item.is_active, item.name)}
                      />
                      <span className="refs-switch-slider"></span>
                    </label>
                  )}
                  {/* 🟢 Скрываем кнопки для основной группы */}
                  {!isDefault(item) && (
                    <>
                      <button className="refs-icon-btn" onClick={() => startEdit(item.id, item.name)}>✏️</button>
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
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h3>{modal.title}</h3>
            <p style={{ margin: '16px 0', color: '#5a6475', fontSize: '14px' }}>{modal.message}</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
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