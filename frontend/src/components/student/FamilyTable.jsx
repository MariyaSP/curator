// frontend/src/components/student/FamilyTable.jsx
// 🟢 ИЗМЕНЕНИЯ:
// 1. Убрано требование телефона для добавления (только ФИО, родство, дата рождения)
// 2. Карточки стали компактными — одна строка на члена семьи
// 3. В режиме просмотра: табличный вид (ФИО | Родство | Дата рождения | Работа | Телефон)
// 4. В режиме редактирования: поля в строку с подписями над ними
// 5. Кнопка удаления теперь внутри строки

import React, { useState } from 'react'
import Button from '../common/Button'
import ConfirmModal from './ConfirmModal'
import './FamilyTable.css'

const RELATIONSHIP_OPTIONS = [
  { value: 'мать', label: 'Мать' },
  { value: 'отец', label: 'Отец' },
  { value: 'брат', label: 'Брат' },
  { value: 'сестра', label: 'Сестра' },
  { value: 'бабушка', label: 'Бабушка' },
  { value: 'дедушка', label: 'Дедушка' },
  { value: 'опекун', label: 'Опекун' }
]

const maskPhone = (value) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''
  let masked = '+7('
  if (digits.length > 1) masked += digits.substring(1, 4)
  if (digits.length > 4) masked += ')-' + digits.substring(4, 7)
  if (digits.length > 7) masked += '-' + digits.substring(7, 9)
  if (digits.length > 9) masked += '-' + digits.substring(9, 11)
  return masked
}

const FamilyTable = ({ members, isEditMode, onAdd, onDelete, onUpdate }) => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [newMember, setNewMember] = useState({
    full_name: '',
    relationship: 'отец',
    birth_date: '',
    work_place: '',
    phone: ''
  })
  const [addErrors, setAddErrors] = useState({})

  const [editingMembers, setEditingMembers] = useState({})
  const [editErrors, setEditErrors] = useState({})

  React.useEffect(() => {
    const initial = {}
    members.forEach(m => {
      initial[m.id] = {
        full_name: m.full_name || '',
        relationship: m.relationship || m.relationship_type || 'отец',
        birth_date: m.birth_date || '',
        work_place: m.work_place || '',
        phone: m.phone || ''
      }
    })
    setEditingMembers(initial)
  }, [members])

  const handleDeleteClick = (id) => {
    setDeleteTarget(id)
    setShowConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (deleteTarget !== null) {
      onDelete(deleteTarget)
      setDeleteTarget(null)
      setShowConfirm(false)
    }
  }

  const handleNewChange = (field, value) => {
    setNewMember(prev => ({ ...prev, [field]: value }))
    if (addErrors[field]) {
      setAddErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleEditChange = (memberId, field, value) => {
    setEditingMembers(prev => {
      const updated = { ...prev, [memberId]: { ...prev[memberId], [field]: value } }
      
      if (onUpdate) {
        const updatedMembers = members.map(m => {
          const edits = updated[m.id]
          if (edits) {
            return {
              ...m,
              full_name: edits.full_name,
              relationship: edits.relationship,
              relationship_type: edits.relationship,
              birth_date: edits.birth_date,
              work_place: edits.work_place,
              phone: edits.phone
            }
          }
          return m
        })
        onUpdate(updatedMembers)
      }
      
      return updated
    })
    
    const errorKey = `${memberId}_${field}`
    if (editErrors[errorKey]) {
      setEditErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // 🟢 ИЗМЕНЕНО: обязательные только ФИО, родство, дата рождения
  const validateMember = (data, prefix = '') => {
    const errors = {}
    
    if (!data.full_name?.trim()) {
      errors[prefix + 'full_name'] = 'Укажите ФИО'
    }
    if (!data.relationship) {
      errors[prefix + 'relationship'] = 'Укажите степень родства'
    }
    if (!data.birth_date) {
      errors[prefix + 'birth_date'] = 'Укажите дату рождения'
    }
    
    // 🟢 Телефон необязателен, но если заполнен — валидируем
    const phoneDigits = (data.phone || '').replace(/\D/g, '')
    if (data.phone && phoneDigits.length > 0 && phoneDigits.length !== 11) {
      errors[prefix + 'phone'] = 'Должно быть 11 цифр'
    }
    
    return errors
  }

  const handleAdd = () => {
    const errors = validateMember(newMember)
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors)
      return
    }
    
    onAdd({ ...newMember })
    setNewMember({ full_name: '', relationship: 'отец', birth_date: '', work_place: '', phone: '' })
    setAddErrors({})
  }

  // 🟢 Форматирование даты для отображения
  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    // Если дата в формате ГГГГ-ММ-ДД, показываем ДД.ММ.ГГГГ
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-')
      return `${d}.${m}.${y}`
    }
    return dateStr
  }

  return (
    <div className="family-table-container">
      {members.length > 0 ? (
        <div className="family-list">
          {/* 🟢 ЗАГОЛОВОК ТАБЛИЦЫ */}
          <div className="family-header-row">
            <span className="family-col family-col-fio">ФИО</span>
            <span className="family-col family-col-relation">Родство</span>
            <span className="family-col family-col-birth">Д/рождения</span>
            <span className="family-col family-col-work">Место работы</span>
            <span className="family-col family-col-phone">Телефон</span>
            {isEditMode && <span className="family-col family-col-actions"></span>}
          </div>

          {members.map((member) => {
            const edit = editingMembers[member.id] || member

            return (
              <div key={member.id} className="family-row">
                {/* ФИО */}
                <div className={`family-col family-col-fio ${isEditMode && editErrors[`${member.id}_full_name`] ? 'has-error' : ''}`}>
                  {!isEditMode ? (
                    <span className="family-value">{member.full_name}</span>
                  ) : (
                    <div className="family-field-compact">
                      <input
                        type="text"
                        value={edit.full_name}
                        onChange={(e) => handleEditChange(member.id, 'full_name', e.target.value)}
                        placeholder="ФИО"
                      />
                      {editErrors[`${member.id}_full_name`] && (
                        <span className="field-error">{editErrors[`${member.id}_full_name`]}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Родство */}
                <div className={`family-col family-col-relation ${isEditMode && editErrors[`${member.id}_relationship`] ? 'has-error' : ''}`}>
                  {!isEditMode ? (
                    <span className="family-value">{member.relationship || member.relationship_type}</span>
                  ) : (
                    <div className="family-field-compact">
                      <select
                        value={edit.relationship}
                        onChange={(e) => handleEditChange(member.id, 'relationship', e.target.value)}
                      >
                        {RELATIONSHIP_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {editErrors[`${member.id}_relationship`] && (
                        <span className="field-error">{editErrors[`${member.id}_relationship`]}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Дата рождения */}
                <div className={`family-col family-col-birth ${isEditMode && editErrors[`${member.id}_birth_date`] ? 'has-error' : ''}`}>
                  {!isEditMode ? (
                    <span className="family-value">{formatDate(member.birth_date)}</span>
                  ) : (
                    <div className="family-field-compact">
                      <input
                        type="date"
                        value={edit.birth_date}
                        onChange={(e) => handleEditChange(member.id, 'birth_date', e.target.value)}
                      />
                      {editErrors[`${member.id}_birth_date`] && (
                        <span className="field-error">{editErrors[`${member.id}_birth_date`]}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Место работы */}
                <div className="family-col family-col-work">
                  {!isEditMode ? (
                    <span className="family-value">{member.work_place || '—'}</span>
                  ) : (
                    <div className="family-field-compact">
                      <input
                        type="text"
                        value={edit.work_place}
                        onChange={(e) => handleEditChange(member.id, 'work_place', e.target.value)}
                        placeholder="Необязательно"
                      />
                    </div>
                  )}
                </div>

                {/* Телефон */}
                <div className={`family-col family-col-phone ${isEditMode && editErrors[`${member.id}_phone`] ? 'has-error' : ''}`}>
                  {!isEditMode ? (
                    <span className="family-value">{member.phone || '—'}</span>
                  ) : (
                    <div className="family-field-compact">
                      <input
                        type="text"
                        value={edit.phone}
                        onChange={(e) => handleEditChange(member.id, 'phone', maskPhone(e.target.value))}
                        placeholder="+7(___)___-__-__"
                      />
                      {editErrors[`${member.id}_phone`] && (
                        <span className="field-error">{editErrors[`${member.id}_phone`]}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Кнопка удаления */}
                {isEditMode && (
                  <div className="family-col family-col-actions">
                    <button 
                      className="delete-member-btn" 
                      onClick={() => handleDeleteClick(member.id)}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="family-empty">Нет данных о составе семьи</div>
      )}

      {/* 🟢 Форма добавления — компактная строка */}
      {isEditMode && (
        <div className="add-family-row">
          <div className="family-col family-col-fio">
            <div className={`family-field-compact ${addErrors.full_name ? 'has-error' : ''}`}>
              <input
                type="text"
                placeholder="ФИО *"
                value={newMember.full_name}
                onChange={(e) => handleNewChange('full_name', e.target.value)}
              />
              {addErrors.full_name && <span className="field-error">{addErrors.full_name}</span>}
            </div>
          </div>

          <div className="family-col family-col-relation">
            <div className={`family-field-compact ${addErrors.relationship ? 'has-error' : ''}`}>
              <select
                value={newMember.relationship}
                onChange={(e) => handleNewChange('relationship', e.target.value)}
              >
                {RELATIONSHIP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {addErrors.relationship && <span className="field-error">{addErrors.relationship}</span>}
            </div>
          </div>

          <div className="family-col family-col-birth">
            <div className={`family-field-compact ${addErrors.birth_date ? 'has-error' : ''}`}>
              <input
                type="date"
                value={newMember.birth_date}
                onChange={(e) => handleNewChange('birth_date', e.target.value)}
              />
              {addErrors.birth_date && <span className="field-error">{addErrors.birth_date}</span>}
            </div>
          </div>

          <div className="family-col family-col-work">
            <div className="family-field-compact">
              <input
                type="text"
                placeholder="Место работы"
                value={newMember.work_place}
                onChange={(e) => handleNewChange('work_place', e.target.value)}
              />
            </div>
          </div>

          <div className="family-col family-col-phone">
            <div className={`family-field-compact ${addErrors.phone ? 'has-error' : ''}`}>
              <input
                type="text"
                placeholder="+7(___)___-__-__"
                value={newMember.phone}
                onChange={(e) => handleNewChange('phone', maskPhone(e.target.value))}
              />
              {addErrors.phone && <span className="field-error">{addErrors.phone}</span>}
            </div>
          </div>

          <div className="family-col family-col-actions">
            <Button variant="primary" onClick={handleAdd}>Добавить</Button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление члена семьи"
        message="Вы уверены, что хотите удалить этого члена семьи?"
      />
    </div>
  )
}

export default FamilyTable