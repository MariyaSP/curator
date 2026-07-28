import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import FamilyTable from './FamilyTable'
import ConfirmModal from './ConfirmModal'
import AddModal from './AddModal'
import api from '../../api/client'
import './StudentDetail.css'

// Импорт иконок
import downloadIcon from '../../assets/icons/download.png'
import achievementsIcon from '../../assets/icons/achievements.png'
import contestsIcon from '../../assets/icons/contests.png'
import heroIcon from '../../assets/icons/hero.png'

const StudentDetail = ({ studentId }) => {
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // ===== Добавляем ref для предотвращения бесконечного цикла =====
  const hasRedirected = useRef(false)

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalType, setAddModalType] = useState('')

  // ===== Загрузка данных студента =====
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/students/${studentId}`)
        setStudent(response.data)
        setError(null)
      } catch (err) {
        console.error('Ошибка загрузки студента:', err)
        setError('Не удалось загрузить данные студента')
      } finally {
        setLoading(false)
      }
    }
    if (studentId) fetchStudent()
  }, [studentId])

  const [familyMembers, setFamilyMembers] = useState([])
  const [achievements, setAchievements] = useState([])
  const [contests, setContests] = useState([])
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (student) {
      setFamilyMembers(student.family_members || [])
      setAchievements(student.achievements || [])
      setContests(student.competitions || [])
      setDocuments(student.documents || [])
    }
  }, [student])

  // ===== ОБРАБОТЧИКИ =====
  const handleAddFamily = (newMember) => {
    if (!newMember.full_name.trim()) {
      alert('Введите ФИО')
      return
    }
    if (!newMember.phone.trim()) {
      alert('Введите телефон')
      return
    }
    const newId = familyMembers.length > 0 ? Math.max(...familyMembers.map(m => m.id)) + 1 : 1
    setFamilyMembers([...familyMembers, { id: newId, ...newMember }])
  }

  const handleDeleteFamily = (id) => {
    setConfirmConfig({
      title: 'Удаление члена семьи',
      message: 'Вы уверены, что хотите удалить этого члена семьи?',
      onConfirm: () => {
        setFamilyMembers(familyMembers.filter(m => m.id !== id))
        setShowConfirm(false)
      }
    })
    setShowConfirm(true)
  }

  const handleAddItem = (type, data) => {
    const newId = Date.now()
    if (type === 'achievement') {
      setAchievements([...achievements, { id: newId, ...data }])
    } else if (type === 'contest') {
      setContests([...contests, { id: newId, ...data }])
    } else if (type === 'document') {
      setDocuments([...documents, { id: newId, title: data.name }])
    }
  }

  const handleDeleteItem = (type, id) => {
    setConfirmConfig({
      title: `Удаление`,
      message: `Вы уверены?`,
      onConfirm: () => {
        if (type === 'achievement') setAchievements(achievements.filter(a => a.id !== id))
        else if (type === 'contest') setContests(contests.filter(c => c.id !== id))
        else if (type === 'document') setDocuments(documents.filter(d => d.id !== id))
        setShowConfirm(false)
      }
    })
    setShowConfirm(true)
  }

  const openAddModal = (type) => {
    setAddModalType(type)
    setShowAddModal(true)
  }

  const handleSave = async () => {
    alert('💾 Сохранение данных (пока заглушка)')
    setIsEditMode(false)
  }

  const handleCancel = () => {
    setIsEditMode(false)
    alert('✕ Изменения отменены')
  }

  // ===== ФОРМИРУЕМ КОМПАКТНЫЕ СТРОКИ =====
  const passportString = () => {
    if (!student) return '—'
    const parts = []
    if (student.passport_series) parts.push(`серия ${student.passport_series}`)
    if (student.passport_number) parts.push(`номер ${student.passport_number}`)
    if (student.passport_issue_date) parts.push(`выдан ${student.passport_issue_date}`)
    if (student.passport_issued_by) parts.push(student.passport_issued_by)
    if (student.passport_department_code) parts.push(`код ${student.passport_department_code}`)
    return parts.length > 0 ? parts.join(', ') : '—'
  }

  const addressString = (type) => {
    if (!student) return '—'
    const parts = []
    if (type === 'registration') {
      if (student.registration_region) parts.push(student.registration_region)
      if (student.registration_city) parts.push(`г. ${student.registration_city}`)
      if (student.registration_street) parts.push(`ул. ${student.registration_street}`)
      if (student.registration_house) parts.push(`д. ${student.registration_house}`)
      if (student.registration_apartment) parts.push(`кв. ${student.registration_apartment}`)
      if (student.registration_zip) parts.push(student.registration_zip)
    } else {
      if (student.actual_region) parts.push(student.actual_region)
      if (student.actual_city) parts.push(`г. ${student.actual_city}`)
      if (student.actual_street) parts.push(`ул. ${student.actual_street}`)
      if (student.actual_house) parts.push(`д. ${student.actual_house}`)
      if (student.actual_apartment) parts.push(`кв. ${student.actual_apartment}`)
      if (student.actual_zip) parts.push(student.actual_zip)
    }
    return parts.length > 0 ? parts.join(', ') : '—'
  }

  // ===== ПОЛУЧАЕМ ИМЯ КУРАТОРА =====
  const getCuratorName = () => {
    if (!student) return '—'
    if (student.curator_name) {
      return student.curator_name
    }
    if (student.curator && student.curator.user) {
      return student.curator.user.full_name
    }
    return '—'
  }

  // ===== ПОЛУЧАЕМ НАЗВАНИЕ СПЕЦИАЛЬНОСТИ =====
  const getSpecialtyName = () => {
    if (!student) return '—'
    if (student.specialty_name) {
      return student.specialty_name
    }
    if (student.group && student.group.specialty) {
      return student.group.specialty.name
    }
    return '—'
  }

  if (loading) return <div className="loading">Загрузка данных студента...</div>
  if (error) return <div className="error">{error}</div>
  if (!student) return <div className="error">Студент не найден</div>

  const photoUrl = student.photo ? `http://localhost:8000${student.photo}` : heroIcon

  return (
    <div className={`student-detail ${isEditMode ? 'edit-mode' : ''}`}>
      {/* ===== ШАПКА ===== */}
      <div className="student-header">
        <button className="back-btn" onClick={() => navigate('/curator')}>← Назад</button>
        <span className="student-number">№ {student.personal_number}</span>
        <span className="student-name">{student.full_name}</span>
        <span className="status-badge active">● Активен</span>
        <div className="header-actions">
          {!isEditMode ? (
            <Button variant="edit" onClick={() => setIsEditMode(true)}>
              ✏️ Редактировать
            </Button>
          ) : (
            <>
              <Button variant="save" onClick={handleSave}>💾 Сохранить</Button>
              <Button variant="cancel" onClick={handleCancel}>✕ Отмена</Button>
            </>
          )}
        </div>
      </div>

      {/* ===== СТРОКА 2: ФОТО + ЛИЧНЫЕ ДАННЫЕ + ДОКУМЕНТЫ ===== */}
      <div className="top-row">
        <div className="card photo-card">
          <img src={photoUrl} alt="Фото студента" />
          <div className="photo-number">{student.personal_number}</div>
          <div className="photo-group">{student.group_name || '—'} · {getSpecialtyName()}</div>
          <div className="photo-curator">Куратор: {getCuratorName()}</div>
          <button className="photo-upload-btn">📷 Загрузить фото</button>
        </div>

        <div className="card personal-card">
          <div className="card-header"><h3>Личные данные</h3></div>
          <div className="info-grid">
            <div className="field">
              <span className="label">Дата рождения</span>
              <span className="value">{student.birth_date || '—'}</span>
              <input type="date" defaultValue={student.birth_date || ''} />
            </div>
            <div className="field">
              <span className="label">Пол</span>
              <span className="value">{student.gender === 'MALE' ? 'Мужской' : 'Женский'}</span>
              <select defaultValue={student.gender || 'MALE'}>
                <option value="MALE">Мужской</option>
                <option value="FEMALE">Женский</option>
              </select>
            </div>
            <div className="field">
              <span className="label">Гражданство</span>
              <span className="value">{student.citizenship || '—'}</span>
              <input type="text" defaultValue={student.citizenship || ''} />
            </div>
            <div className="field">
              <span className="label">Email</span>
              <span className="value">{student.email || '—'}</span>
              <input type="email" defaultValue={student.email || ''} />
            </div>
            <div className="field">
              <span className="label">Телефон</span>
              <span className="value">{student.phone || '—'}</span>
              <input type="text" defaultValue={student.phone || ''} />
            </div>
            <div className="field">
              <span className="label">Статус</span>
              <span className="value" style={{ color: student.is_active ? '#0f6b3a' : '#d32f2f' }}>
                {student.is_active ? 'Обучается' : 'Не активен'}
              </span>
              <select defaultValue={student.is_active ? 'active' : 'inactive'}>
                <option value="active">Обучается</option>
                <option value="inactive">Не активен</option>
              </select>
            </div>
            <div className="field">
              <span className="label">Социальный статус</span>
              <span className="value">{student.social_status || '—'}</span>
              <input type="text" defaultValue={student.social_status || ''} />
            </div>
            <div className="field">
              <span className="label">Группа здоровья</span>
              <span className="value">{student.health_group || '—'}</span>
              <input type="text" defaultValue={student.health_group || ''} />
            </div>
            <div className="field">
              <span className="label">Инвалидность</span>
              <span className="value">{student.is_disabled ? student.disability_group || 'Есть' : 'Нет'}</span>
              <select defaultValue={student.is_disabled ? student.disability_group || 'disabled' : 'none'}>
                <option value="none">Нет</option>
                <option value="I">I группа</option>
                <option value="II">II группа</option>
                <option value="III">III группа</option>
              </select>
            </div>
            <div className="field">
              <span className="label">ИНН</span>
              <span className="value">{student.inn || '—'}</span>
              <input type="text" defaultValue={student.inn || ''} />
            </div>
            <div className="field">
              <span className="label">СНИЛС</span>
              <span className="value">{student.snils || '—'}</span>
              <input type="text" defaultValue={student.snils || ''} />
            </div>
            <div className="field">
              <span className="label">Мед. полис</span>
              <span className="value">{student.medical_policy || '—'}</span>
              <input type="text" defaultValue={student.medical_policy || ''} />
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА — ДОКУМЕНТЫ */}
        <div className="card right-card">
          <div className="card-header">
            <h3><img src={downloadIcon} alt="Документы" className="section-icon" /> Документы</h3>
            <button className="add-btn" onClick={() => openAddModal('document')}>+</button>
          </div>
          <ul>
            {documents.length > 0 ? (
              documents.map(doc => (
                <li key={doc.id}>
                  <span>📄 {doc.title}</span>
                  <img src={downloadIcon} alt="Скачать" className="doc-icon" />
                  {isEditMode && <button className="delete-item" onClick={() => handleDeleteItem('document', doc.id)}>✕</button>}
                </li>
              ))
            ) : (
              <li style={{ color: '#7a8a9e', fontSize: '13px' }}>Нет загруженных документов</li>
            )}
          </ul>
        </div>
      </div>

      {/* ===== СТРОКА 3: ПАСПОРТ + АДРЕСА + ДОСТИЖЕНИЯ ===== */}
      <div className="student-grid">
        <div className="left-column">
          {/* ПАСПОРТ (компактная строка) */}
          <div className="card">
            <div className="card-header"><h3>Паспортные данные</h3></div>
            <div className="compact-row">
              <span className="view-field">{passportString()}</span>
              <div className="edit-field">
                <div className="info-grid">
                  <div className="field">
                    <span className="label">Серия</span>
                    <input type="text" defaultValue={student.passport_series || ''} />
                  </div>
                  <div className="field">
                    <span className="label">Номер</span>
                    <input type="text" defaultValue={student.passport_number || ''} />
                  </div>
                  <div className="field">
                    <span className="label">Дата выдачи</span>
                    <input type="date" defaultValue={student.passport_issue_date || ''} />
                  </div>
                  <div className="field" style={{ gridColumn: 'span 2' }}>
                    <span className="label">Кем выдан</span>
                    <input type="text" defaultValue={student.passport_issued_by || ''} />
                  </div>
                  <div className="field">
                    <span className="label">Код подразделения</span>
                    <input type="text" defaultValue={student.passport_department_code || ''} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* АДРЕСА (компактные строки) */}
          <div className="card">
            <div className="card-header"><h3>Адреса</h3></div>
            <div className="compact-row">
              <span className="view-field">
                <span className="label">Прописка:</span> {addressString('registration')}
              </span>
              <div className="edit-field">
                <div className="address-block">
                  <h4>📍 Адрес по прописке</h4>
                  <div className="info-grid">
                    <div className="field"><span className="label">Область</span><input type="text" defaultValue={student.registration_region || ''} /></div>
                    <div className="field"><span className="label">Город</span><input type="text" defaultValue={student.registration_city || ''} /></div>
                    <div className="field"><span className="label">Улица</span><input type="text" defaultValue={student.registration_street || ''} /></div>
                    <div className="field"><span className="label">Дом</span><input type="text" defaultValue={student.registration_house || ''} /></div>
                    <div className="field"><span className="label">Квартира</span><input type="text" defaultValue={student.registration_apartment || ''} /></div>
                    <div className="field"><span className="label">Индекс</span><input type="text" defaultValue={student.registration_zip || ''} /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="compact-row" style={{ borderBottom: 'none' }}>
              <span className="view-field">
                <span className="label">Фактический:</span> {addressString('actual')}
              </span>
              <div className="edit-field">
                <div className="address-block">
                  <h4>📍 Фактический адрес</h4>
                  <div className="info-grid">
                    <div className="field"><span className="label">Область</span><input type="text" defaultValue={student.actual_region || ''} /></div>
                    <div className="field"><span className="label">Город</span><input type="text" defaultValue={student.actual_city || ''} /></div>
                    <div className="field"><span className="label">Улица</span><input type="text" defaultValue={student.actual_street || ''} /></div>
                    <div className="field"><span className="label">Дом</span><input type="text" defaultValue={student.actual_house || ''} /></div>
                    <div className="field"><span className="label">Квартира</span><input type="text" defaultValue={student.actual_apartment || ''} /></div>
                    <div className="field"><span className="label">Индекс</span><input type="text" defaultValue={student.actual_zip || ''} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* СОСТАВ СЕМЬИ */}
          <div className="card">
            <div className="card-header"><h3>Состав семьи</h3></div>
            <FamilyTable
              members={familyMembers}
              isEditMode={isEditMode}
              onAdd={handleAddFamily}
              onDelete={handleDeleteFamily}
            />
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА — ДОСТИЖЕНИЯ */}
        <div className="right-column">
          <div className="card right-card">
            <div className="card-header">
              <h3><img src={achievementsIcon} alt="Достижения" className="section-icon" /> Достижения</h3>
              <button className="add-btn" onClick={() => openAddModal('achievement')}>+</button>
            </div>
            {achievements.length > 0 ? (
              <div className="achievement-group">
                <div className="year-title">2025</div>
                {achievements.map(a => (
                  <div key={a.id} className="achievement-item">
                    <span>{a.title}</span>
                    <span>
                      <span className={`tag ${a.type || 'academic'}`}>
                        {a.type === 'academic' ? 'Учебное' : a.type === 'sport' ? 'Спортивное' : 'Творческое'}
                      </span>
                      {isEditMode && <button className="delete-item" onClick={() => handleDeleteItem('achievement', a.id)}>✕</button>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#7a8a9e', fontSize: '13px', padding: '8px 0' }}>Нет достижений</div>
            )}
          </div>

          {/* ПРАВАЯ КОЛОНКА — КОНКУРСЫ */}
          <div className="card right-card">
            <div className="card-header">
              <h3><img src={contestsIcon} alt="Конкурсы" className="section-icon" /> Конкурсы</h3>
              <button className="add-btn" onClick={() => openAddModal('contest')}>+</button>
            </div>
            {contests.length > 0 ? (
              <div className="achievement-group">
                <div className="year-title">2025</div>
                {contests.map(c => (
                  <div key={c.id} className="achievement-item">
                    <span>{c.title} — {c.result || 'Участие'}</span>
                    <span>
                      <span className="tag competition">Победа</span>
                      {isEditMode && <button className="delete-item" onClick={() => handleDeleteItem('contest', c.id)}>✕</button>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#7a8a9e', fontSize: '13px', padding: '8px 0' }}>Нет конкурсов</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== МОДАЛКИ ===== */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />

      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        type={addModalType}
        onAdd={(data) => {
          handleAddItem(addModalType, data)
          setShowAddModal(false)
        }}
      />

    </div>
  )
}

export default StudentDetail