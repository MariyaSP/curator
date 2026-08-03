// frontend/src/components/student/FamilyTable.jsx

import React, { useState } from 'react'
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

  const handleDeleteClick = (id) => { setDeleteTarget(id); setShowConfirm(true) }
  const handleConfirmDelete = () => {
    if (deleteTarget !== null) { onDelete(deleteTarget); setDeleteTarget(null); setShowConfirm(false) }
  }

  const handleNewChange = (field, value) => {
    setNewMember(prev => ({ ...prev, [field]: value }))
    if (addErrors[field]) setAddErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleEditChange = (memberId, field, value) => {
    setEditingMembers(prev => {
      const updated = { ...prev, [memberId]: { ...prev[memberId], [field]: value } }
      if (onUpdate) {
        const updatedMembers = members.map(m => {
          const edits = updated[m.id]
          if (edits) return { ...m, full_name: edits.full_name, relationship: edits.relationship, relationship_type: edits.relationship, birth_date: edits.birth_date, work_place: edits.work_place, phone: edits.phone }
          return m
        })
        onUpdate(updatedMembers)
      }
      return updated
    })
    if (editErrors[`${memberId}_${field}`]) {
      setEditErrors(prev => { const n = { ...prev }; delete n[`${memberId}_${field}`]; return n })
    }
  }

  const validateMember = (data, prefix = '') => {
    const errors = {}
    if (!data.full_name?.trim()) errors[prefix + 'full_name'] = 'Укажите ФИО'
    if (!data.relationship) errors[prefix + 'relationship'] = 'Укажите степень родства'
    if (!data.birth_date) errors[prefix + 'birth_date'] = 'Укажите дату рождения'
    const d = (data.phone || '').replace(/\D/g, '')
    if (data.phone && d.length > 0 && d.length !== 11) errors[prefix + 'phone'] = 'Должно быть 11 цифр'
    return errors
  }

  const handleAdd = () => {
    const errors = validateMember(newMember)
    if (Object.keys(errors).length > 0) { setAddErrors(errors); return }
    onAdd({ ...newMember })
    setNewMember({ full_name: '', relationship: 'отец', birth_date: '', work_place: '', phone: '' })
    setAddErrors({})
  }

  const relationshipLabel = (rel) => {
    const opt = RELATIONSHIP_OPTIONS.find(o => o.value === rel)
    return opt ? opt.label : rel
  }

  return (
    <div className="family-table-container">
      {members.length > 0 ? (
        <div className="family-fieldsets">
          {members.map((member) => {
            const edit = editingMembers[member.id] || member
            const rel = member.relationship || member.relationship_type || '—'

            return (
              <fieldset key={member.id} className="family-fieldset">
                <legend className="family-legend">
                  {relationshipLabel(rel).charAt(0).toUpperCase() + relationshipLabel(rel).slice(1)}
                  {isEditMode && (
                    <button className="delete-member-btn" onClick={() => handleDeleteClick(member.id)} title="Удалить">✕</button>
                  )}
                </legend>

                {/* Строка 1: ФИО | Родство (только в edit) | Дата рождения */}
                <div className="family-fieldset-row">
                  <div className={`family-fieldset-field ${isEditMode && editErrors[`${member.id}_full_name`] ? 'has-error' : ''}`}>
                    <span className="family-fieldset-label">ФИО</span>
                    {isEditMode ? (
                      <>
                        <input type="text" value={edit.full_name} onChange={(e) => handleEditChange(member.id, 'full_name', e.target.value)} placeholder="ФИО" />
                        {editErrors[`${member.id}_full_name`] && <span className="field-error">{editErrors[`${member.id}_full_name`]}</span>}
                      </>
                    ) : (
                      <div className="family-fieldset-display">{member.full_name}</div>
                    )}
                  </div>

                  {isEditMode && (
                    <div className={`family-fieldset-field ${editErrors[`${member.id}_relationship`] ? 'has-error' : ''}`}>
                      <span className="family-fieldset-label">Родство</span>
                      <select value={edit.relationship} onChange={(e) => handleEditChange(member.id, 'relationship', e.target.value)}>
                        {RELATIONSHIP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      {editErrors[`${member.id}_relationship`] && <span className="field-error">{editErrors[`${member.id}_relationship`]}</span>}
                    </div>
                  )}

                  <div className={`family-fieldset-field ${isEditMode && editErrors[`${member.id}_birth_date`] ? 'has-error' : ''}`}>
                    <span className="family-fieldset-label">Дата рождения</span>
                    {isEditMode ? (
                      <>
                        <input type="date" value={edit.birth_date} onChange={(e) => handleEditChange(member.id, 'birth_date', e.target.value)} />
                        {editErrors[`${member.id}_birth_date`] && <span className="field-error">{editErrors[`${member.id}_birth_date`]}</span>}
                      </>
                    ) : (
                      <div className="family-fieldset-display">{member.birth_date || '—'}</div>
                    )}
                  </div>
                </div>

                {/* Строка 2: Место работы (на 2 поля) | Телефон */}
                <div className="family-fieldset-row">
                  <div className="family-fieldset-field" style={{ flex: 2 }}>
                    <span className="family-fieldset-label">Место работы</span>
                    {isEditMode ? (
                      <input type="text" value={edit.work_place} onChange={(e) => handleEditChange(member.id, 'work_place', e.target.value)} placeholder="Место работы" />
                    ) : (
                      <div className="family-fieldset-display">{member.work_place || '—'}</div>
                    )}
                  </div>

                  <div className={`family-fieldset-field ${isEditMode && editErrors[`${member.id}_phone`] ? 'has-error' : ''}`}>
                    <span className="family-fieldset-label">Телефон</span>
                    {isEditMode ? (
                      <>
                        <input type="text" value={edit.phone} onChange={(e) => handleEditChange(member.id, 'phone', maskPhone(e.target.value))} placeholder="+7(___)___-__-__" />
                        {editErrors[`${member.id}_phone`] && <span className="field-error">{editErrors[`${member.id}_phone`]}</span>}
                      </>
                    ) : (
                      <div className="family-fieldset-display">{member.phone || '—'}</div>
                    )}
                  </div>
                </div>
              </fieldset>
            )
          })}
        </div>
      ) : (
        <div className="family-empty">Нет данных о составе семьи</div>
      )}

      {/* Форма добавления */}
      {isEditMode && (
        <fieldset className="family-fieldset family-fieldset-add">
          <legend className="family-legend">Добавить</legend>
          <div className="family-fieldset-row">
            <div className={`family-fieldset-field ${addErrors.full_name ? 'has-error' : ''}`}>
              <span className="family-fieldset-label">ФИО *</span>
              <input type="text" placeholder="Введите ФИО" value={newMember.full_name} onChange={(e) => handleNewChange('full_name', e.target.value)} />
              {addErrors.full_name && <span className="field-error">{addErrors.full_name}</span>}
            </div>
            <div className={`family-fieldset-field ${addErrors.relationship ? 'has-error' : ''}`}>
              <span className="family-fieldset-label">Родство *</span>
              <select value={newMember.relationship} onChange={(e) => handleNewChange('relationship', e.target.value)}>
                {RELATIONSHIP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {addErrors.relationship && <span className="field-error">{addErrors.relationship}</span>}
            </div>
            <div className={`family-fieldset-field ${addErrors.birth_date ? 'has-error' : ''}`}>
              <span className="family-fieldset-label">Дата рождения *</span>
              <input type="date" value={newMember.birth_date} onChange={(e) => handleNewChange('birth_date', e.target.value)} />
              {addErrors.birth_date && <span className="field-error">{addErrors.birth_date}</span>}
            </div>
          </div>
          <div className="family-fieldset-row">
            <div className="family-fieldset-field" style={{ flex: 2 }}>
              <span className="family-fieldset-label">Место работы</span>
              <input type="text" placeholder="Необязательно" value={newMember.work_place} onChange={(e) => handleNewChange('work_place', e.target.value)} />
            </div>
            <div className={`family-fieldset-field ${addErrors.phone ? 'has-error' : ''}`}>
              <span className="family-fieldset-label">Телефон</span>
              <input type="text" placeholder="+7(___)___-__-__" value={newMember.phone} onChange={(e) => handleNewChange('phone', maskPhone(e.target.value))} />
              {addErrors.phone && <span className="field-error">{addErrors.phone}</span>}
            </div>
            <div className="family-fieldset-field" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', flex: '0 0 auto' }}>
              <button className="add-btn" onClick={handleAdd}>+</button>
            </div>
          </div>
        </fieldset>
      )}

      <ConfirmModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleConfirmDelete} title="Удаление члена семьи" message="Вы уверены, что хотите удалить этого члена семьи?" />
    </div>
  )
}

export default FamilyTable