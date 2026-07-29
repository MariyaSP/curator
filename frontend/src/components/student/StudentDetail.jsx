// frontend/src/components/student/StudentDetail.jsx

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

// Дефолтное фото
const DEFAULT_PHOTO_URL = 'http://localhost:8000/uploads/photos/default_foto.png'

// 🟢 Маски ввода
const MASKS = {
  phone: (value) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 0) return ''
    let masked = '+7('
    if (digits.length > 1) masked += digits.substring(1, 4)
    if (digits.length > 4) masked += ')-' + digits.substring(4, 7)
    if (digits.length > 7) masked += '-' + digits.substring(7, 9)
    if (digits.length > 9) masked += '-' + digits.substring(9, 11)
    return masked
  },
  snils: (value) => {
    const digits = value.replace(/\D/g, '').substring(0, 11)
    let masked = ''
    if (digits.length > 0) masked += digits.substring(0, 3)
    if (digits.length > 3) masked += '-' + digits.substring(3, 6)
    if (digits.length > 6) masked += '-' + digits.substring(6, 9)
    if (digits.length > 9) masked += ' ' + digits.substring(9, 11)
    return masked
  },
  passportSeries: (value) => value.replace(/\D/g, '').substring(0, 4),
  passportNumber: (value) => value.replace(/\D/g, '').substring(0, 6),
  passportCode: (value) => {
    const digits = value.replace(/\D/g, '').substring(0, 6)
    if (digits.length > 3) return digits.substring(0, 3) + '-' + digits.substring(3, 6)
    return digits
  },
  inn: (value) => value.replace(/\D/g, '').substring(0, 12),
  zip: (value) => value.replace(/\D/g, '').substring(0, 6)
}

const DISABILITY_OPTIONS = [
  { value: '', label: 'Не выбрано' },
  { value: 'I', label: 'I группа' },
  { value: 'II', label: 'II группа' },
  { value: 'III', label: 'III группа' }
]

const REQUIRED_FIELDS = [
  'birth_date', 'gender', 'citizenship', 'email', 'phone',
  'social_status_id', 'health_group_id'
]

const PASSPORT_FIELDS = [
  'passport_series', 'passport_number', 'passport_issue_date',
  'passport_issued_by', 'passport_department_code'
]

const ADDRESS_FIELDS_REQUIRED = ['region', 'city', 'house', 'zip']
const ADDRESS_FIELDS_OPTIONAL = ['street', 'apartment']

// Проверка возраста (14 лет)
const isAtLeast14YearsOld = (birthDateStr, passportDateStr) => {
  if (!birthDateStr || !passportDateStr) return true
  const birthDate = new Date(birthDateStr)
  const passportDate = new Date(passportDateStr)
  const age14Date = new Date(birthDate)
  age14Date.setFullYear(age14Date.getFullYear() + 14)
  return passportDate >= age14Date
}

const StudentDetail = ({ studentId }) => {
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)

  const [editData, setEditData] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalType, setAddModalType] = useState('')

  const [socialStatuses, setSocialStatuses] = useState([])
  const [healthGroups, setHealthGroups] = useState([])

  const [refsLoaded, setRefsLoaded] = useState(false)

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [statusesRes, groupsRes] = await Promise.all([
          api.get('/students/references/social-statuses'),
          api.get('/students/references/health-groups')
        ])
        setSocialStatuses(statusesRes.data)
        setHealthGroups(groupsRes.data)
        setRefsLoaded(true)
      } catch (err) {
        console.error('Ошибка загрузки справочников:', err)
        setRefsLoaded(true)
      }
    }
    fetchReferences()
  }, [])

  useEffect(() => {
    if (!refsLoaded || !studentId) return
    
    const fetchStudent = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/students/${studentId}`)
        const studentData = response.data
        
        setStudent(studentData)
        
        setEditData({
          ...studentData,
          social_status_id: studentData.social_status_id 
            || (socialStatuses.find(s => s.code === 'full')?.id) 
            || '',
          health_group_id: studentData.health_group_id 
            || (healthGroups.find(g => g.code === 'basic')?.id) 
            || '',
        })
        setFamilyMembers(studentData.family_members || [])
        setAchievements(studentData.achievements || [])
        setContests(studentData.competitions || [])
        setDocuments(studentData.documents || [])
        setError(null)
      } catch (err) {
        console.error('Ошибка загрузки студента:', err)
        setError('Не удалось загрузить данные студента')
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [studentId, refsLoaded, socialStatuses, healthGroups])

  const [familyMembers, setFamilyMembers] = useState([])
  const [achievements, setAchievements] = useState([])
  const [contests, setContests] = useState([])
  const [documents, setDocuments] = useState([])

  const handleFieldChange = (field, value) => {
    let maskedValue = value

    switch (field) {
      case 'phone': maskedValue = MASKS.phone(value); break
      case 'snils': maskedValue = MASKS.snils(value); break
      case 'passport_series': maskedValue = MASKS.passportSeries(value); break
      case 'passport_number': maskedValue = MASKS.passportNumber(value); break
      case 'passport_department_code': maskedValue = MASKS.passportCode(value); break
      case 'inn': maskedValue = MASKS.inn(value); break
      case 'registration_zip':
      case 'actual_zip': maskedValue = MASKS.zip(value); break
      default: maskedValue = value
    }

    setEditData(prev => ({ ...prev, [field]: maskedValue }))
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const isEmpty = (value) => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    return false
  }

  const isPartiallyFilled = (fields, prefix = '') => {
    const values = fields.map(f => editData[prefix ? `${prefix}_${f}` : f])
    const filledCount = values.filter(v => !isEmpty(v)).length
    return filledCount > 0 && filledCount < fields.length
  }

  const validateForm = () => {
    const errors = {}
    const data = editData

    REQUIRED_FIELDS.forEach(field => {
      if (isEmpty(data[field])) {
        errors[field] = 'Обязательное поле'
      }
    })

    const phoneDigits = (data.phone || '').replace(/\D/g, '')
    if (!isEmpty(data.phone) && phoneDigits.length !== 11) {
      errors.phone = 'Телефон должен содержать 11 цифр'
    }

    if (data.social_status_id) {
      const status = socialStatuses.find(s => s.id === data.social_status_id)
      if (status?.code === 'disabled' && isEmpty(data.disability_group)) {
        errors.disability_group = 'При статусе "Инвалид" укажите группу инвалидности'
      }
    }

    if (isPartiallyFilled(PASSPORT_FIELDS)) {
      PASSPORT_FIELDS.forEach(field => {
        if (isEmpty(data[field])) {
          const labels = {
            passport_series: 'Серия паспорта',
            passport_number: 'Номер паспорта',
            passport_issue_date: 'Дата выдачи',
            passport_issued_by: 'Кем выдан',
            passport_department_code: 'Код подразделения'
          }
          errors[field] = `Заполните "${labels[field] || field}"`
        }
      })
    }

    if (!isEmpty(data.passport_series) && data.passport_series.length !== 4) {
      errors.passport_series = 'Серия паспорта — 4 цифры'
    }
    if (!isEmpty(data.passport_number) && data.passport_number.length !== 6) {
      errors.passport_number = 'Номер паспорта — 6 цифр'
    }
    const codeDigits = (data.passport_department_code || '').replace(/\D/g, '')
    if (!isEmpty(data.passport_department_code) && codeDigits.length !== 6) {
      errors.passport_department_code = 'Код подразделения — 6 цифр'
    }
    if (!isEmpty(data.passport_issue_date) && !isEmpty(data.birth_date)) {
      if (!isAtLeast14YearsOld(data.birth_date, data.passport_issue_date)) {
        errors.passport_issue_date = 'Дата выдачи не может быть раньше 14-летия'
      }
    }

    const regAll = [...ADDRESS_FIELDS_REQUIRED, ...ADDRESS_FIELDS_OPTIONAL]
    if (isPartiallyFilled(regAll, 'registration')) {
      ADDRESS_FIELDS_REQUIRED.forEach(f => {
        if (isEmpty(data[`registration_${f}`])) {
          const labels = { region: 'Область', city: 'Город', house: 'Дом', zip: 'Индекс' }
          errors[`registration_${f}`] = `Заполните "${labels[f] || f}"`
        }
      })
    }
    if (!isEmpty(data.registration_zip) && data.registration_zip.length !== 6) {
      errors.registration_zip = 'Индекс — 6 цифр'
    }

    const actAll = [...ADDRESS_FIELDS_REQUIRED, ...ADDRESS_FIELDS_OPTIONAL]
    if (isPartiallyFilled(actAll, 'actual')) {
      ADDRESS_FIELDS_REQUIRED.forEach(f => {
        if (isEmpty(data[`actual_${f}`])) {
          const labels = { region: 'Область', city: 'Город', house: 'Дом', zip: 'Индекс' }
          errors[`actual_${f}`] = `Заполните "${labels[f] || f}"`
        }
      })
    }
    if (!isEmpty(data.actual_zip) && data.actual_zip.length !== 6) {
      errors.actual_zip = 'Индекс — 6 цифр'
    }

    const innDigits = (data.inn || '').replace(/\D/g, '')
    if (!isEmpty(data.inn) && innDigits.length !== 12) {
      errors.inn = 'ИНН должен содержать 12 цифр'
    }
    const snilsDigits = (data.snils || '').replace(/\D/g, '')
    if (!isEmpty(data.snils) && snilsDigits.length !== 11) {
      errors.snils = 'СНИЛС должен содержать 11 цифр'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const copyRegistrationAddress = () => {
    setEditData(prev => ({
      ...prev,
      actual_region: prev.registration_region || '',
      actual_city: prev.registration_city || '',
      actual_street: prev.registration_street || '',
      actual_house: prev.registration_house || '',
      actual_apartment: prev.registration_apartment || '',
      actual_zip: prev.registration_zip || ''
    }))
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.actual_region
      delete newErrors.actual_city
      delete newErrors.actual_street
      delete newErrors.actual_house
      delete newErrors.actual_apartment
      delete newErrors.actual_zip
      return newErrors
    })
  }

  // ===== ОБРАБОТЧИКИ =====
  const handleAddFamily = (newMember) => {
    if (!newMember.full_name?.trim()) return
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

  const handleUpdateFamily = (updatedMembers) => {
    setFamilyMembers(updatedMembers)
  }

  const handleAddItem = (type, data) => {
    const newId = Date.now()
    if (type === 'achievement') setAchievements([...achievements, { id: newId, ...data }])
    else if (type === 'contest') setContests([...contests, { id: newId, ...data }])
    else if (type === 'document') setDocuments([...documents, { id: newId, title: data.name }])
  }

  const handleDeleteItem = (type, id) => {
    setConfirmConfig({
      title: 'Удаление',
      message: 'Вы уверены?',
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
    if (!validateForm()) {
      const firstErrorField = Object.keys(fieldErrors)[0]
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`)
        if (element) element.focus()
      }
      return
    }

    try {
      const dataToSave = {
        birth_date: editData.birth_date || null,
        gender: editData.gender || null,
        citizenship: editData.citizenship || null,
        email: editData.email || null,
        phone: editData.phone || null,
        
        social_status_id: editData.social_status_id || null,
        health_group_id: editData.health_group_id || null,
        
        is_disabled: editData.is_disabled || false,
        disability_group: editData.disability_group || null,
        
        is_active: editData.is_active !== undefined ? editData.is_active : true,
        
        inn: editData.inn || null,
        snils: editData.snils || null,
        medical_policy: editData.medical_policy || null,
        
        notes: editData.notes || null,

        passport: {
          series: editData.passport_series || null,
          number: editData.passport_number || null,
          issue_date: editData.passport_issue_date || null,
          issued_by: editData.passport_issued_by || null,
          department_code: editData.passport_department_code || null,
        },

        registration_address: {
          region: editData.registration_region || null,
          city: editData.registration_city || '',
          street: editData.registration_street || null,
          house: editData.registration_house || null,
          apartment: editData.registration_apartment || null,
          zip_code: editData.registration_zip || null,
        },

        actual_address: {
          region: editData.actual_region || null,
          city: editData.actual_city || '',
          street: editData.actual_street || null,
          house: editData.actual_house || null,
          apartment: editData.actual_apartment || null,
          zip_code: editData.actual_zip || null,
        },

        family_members: familyMembers.map(m => ({
          full_name: m.full_name,
          relationship: m.relationship || m.relationship_type,
          relationship_type: m.relationship || m.relationship_type,
          birth_date: m.birth_date || null,
          work_place: m.work_place || '',
          phone: m.phone || '',
        })),
      }
      
      console.log('📤 Отправляем данные:', JSON.stringify(dataToSave, null, 2))
      
      const response = await api.put(`/students/${studentId}`, dataToSave)
      
      setStudent(response.data)
      setFamilyMembers(response.data.family_members || [])
      setIsEditMode(false)
      setFieldErrors({})
      console.log('✅ Все данные сохранены')
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err)
      
      let errorMessage = 'Не удалось сохранить данные'
      
      if (err.response?.data) {
        const detail = err.response.data.detail
        
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map(d => `${d.loc?.join('.') || ''}: ${d.msg}`).join('; ')
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail)
        }
        
        console.error('Детали ошибки:', err.response.data)
      }
      
      setFieldErrors({ submit: errorMessage })
    }
  }

  const handleCancel = () => {
    setEditData({
      ...student,
      social_status_id: student.social_status_id 
        || (socialStatuses.find(s => s.code === 'full')?.id) 
        || '',
      health_group_id: student.health_group_id 
        || (healthGroups.find(g => g.code === 'basic')?.id) 
        || '',
    })
    setFamilyMembers(student.family_members || [])
    setFieldErrors({})
    setIsEditMode(false)
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Разрешены только изображения (JPEG, PNG, GIF, WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Файл слишком большой. Максимальный размер: 5 МБ')
      return
    }
    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const response = await api.post(`/students/${studentId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStudent({ ...student, photo: `${response.data.photo_url}?t=${Date.now()}` })
      setEditData(prev => ({ ...prev, photo: response.data.photo_url }))
    } catch (err) {
      console.error('❌ Ошибка загрузки фото:', err)
      alert(`❌ ${err.response?.data?.detail || 'Не удалось загрузить фото'}`)
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
    const prefix = type === 'registration' ? 'registration_' : 'actual_'
    if (student[prefix + 'region']) parts.push(student[prefix + 'region'])
    if (student[prefix + 'city']) parts.push(`г. ${student[prefix + 'city']}`)
    if (student[prefix + 'street']) parts.push(`ул. ${student[prefix + 'street']}`)
    if (student[prefix + 'house']) parts.push(`д. ${student[prefix + 'house']}`)
    if (student[prefix + 'apartment']) parts.push(`кв. ${student[prefix + 'apartment']}`)
    if (student[prefix + 'zip']) parts.push(student[prefix + 'zip'])
    return parts.length > 0 ? parts.join(', ') : '—'
  }

  const getCuratorName = () => {
    if (!student) return '—'
    if (student.curator_name) return student.curator_name
    return '—'
  }

  const getSpecialtyName = () => {
    if (!student) return '—'
    if (student.specialty_name) return student.specialty_name
    return '—'
  }

  const getSocialStatusLabel = (id) => {
    const status = socialStatuses.find(s => s.id === id)
    return status ? status.name : '—'
  }

  const getHealthGroupLabel = (id) => {
    const group = healthGroups.find(g => g.id === id)
    return group ? group.name : '—'
  }

  const getSocialStatusCode = (id) => {
    const status = socialStatuses.find(s => s.id === id)
    return status?.code || ''
  }

  if (loading) return <div className="loading">Загрузка данных студента...</div>
  if (error) return <div className="error">{error}</div>
  if (!student) return <div className="error">Студент не найден</div>

  const photoUrl = student.photo 
    ? `http://localhost:8000${student.photo}` 
    : DEFAULT_PHOTO_URL

  return (
    <div className={`student-detail ${isEditMode ? 'edit-mode' : ''}`}>
      <div className="student-header">
        <button className="back-btn" onClick={() => navigate('/curator')}>← Назад</button>
        <span className="student-number">№ {student.personal_number}</span>
        <span className="student-name">{student.full_name}</span>
        <span className="status-badge active">● Активен</span>
        <div className="header-actions">
          {!isEditMode ? (
            <Button variant="edit" onClick={() => setIsEditMode(true)}>✏️ Редактировать</Button>
          ) : (
            <>
              <Button variant="save" onClick={handleSave}>💾 Сохранить</Button>
              <Button variant="cancel" onClick={handleCancel}>✕ Отмена</Button>
            </>
          )}
        </div>
      </div>

      {fieldErrors.submit && (
        <div className="form-error-banner">{fieldErrors.submit}</div>
      )}

      <div className="top-row">
        <div className="card photo-card">
          <img src={photoUrl} alt="Фото студента" />
          <div className="photo-number">{student.personal_number}</div>
          <div className="photo-group">{student.group_name || '—'} · {getSpecialtyName()}</div>
          <div className="photo-curator">Куратор: {getCuratorName()}</div>
          <button className="photo-upload-btn" onClick={handleUploadClick} disabled={isUploadingPhoto}>
            {isUploadingPhoto ? '⏳ Загрузка...' : '📷 Загрузить фото'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>

        <div className="card personal-card">
          <div className="card-header"><h3>Личные данные</h3></div>
          <div className="info-grid">
            <div className={`field ${fieldErrors.birth_date ? 'has-error' : ''}`}>
              <span className="label">Дата рождения</span>
              <span className="value">{student.birth_date || '—'}</span>
              <input type="date" name="birth_date" value={editData.birth_date || ''} onChange={(e) => handleFieldChange('birth_date', e.target.value)} />
              {fieldErrors.birth_date && <span className="field-error">{fieldErrors.birth_date}</span>}
            </div>
            <div className={`field ${fieldErrors.gender ? 'has-error' : ''}`}>
              <span className="label">Пол</span>
              <span className="value">{student.gender === 'MALE' ? 'Мужской' : 'Женский'}</span>
              <select name="gender" value={editData.gender || 'MALE'} onChange={(e) => handleFieldChange('gender', e.target.value)}>
                <option value="MALE">Мужской</option>
                <option value="FEMALE">Женский</option>
              </select>
              {fieldErrors.gender && <span className="field-error">{fieldErrors.gender}</span>}
            </div>
            <div className={`field ${fieldErrors.citizenship ? 'has-error' : ''}`}>
              <span className="label">Гражданство</span>
              <span className="value">{student.citizenship || '—'}</span>
              <input type="text" name="citizenship" value={editData.citizenship || ''} onChange={(e) => handleFieldChange('citizenship', e.target.value)} />
              {fieldErrors.citizenship && <span className="field-error">{fieldErrors.citizenship}</span>}
            </div>
            <div className={`field ${fieldErrors.email ? 'has-error' : ''}`}>
              <span className="label">Email</span>
              <span className="value">{student.email || '—'}</span>
              <input type="email" name="email" value={editData.email || ''} onChange={(e) => handleFieldChange('email', e.target.value)} />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className={`field ${fieldErrors.phone ? 'has-error' : ''}`}>
              <span className="label">Телефон</span>
              <span className="value">{student.phone || '—'}</span>
              <input type="text" name="phone" value={editData.phone || ''} onChange={(e) => handleFieldChange('phone', e.target.value)} placeholder="+7(___)___-__-__" />
              {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
            </div>
            <div className={`field ${fieldErrors.is_active ? 'has-error' : ''}`}>
              <span className="label">Статус</span>
              <span className="value" style={{ color: student.is_active ? '#0f6b3a' : '#d32f2f' }}>{student.is_active ? 'Обучается' : 'Не активен'}</span>
              <select name="is_active" value={editData.is_active ? 'active' : 'inactive'} onChange={(e) => handleFieldChange('is_active', e.target.value === 'active')}>
                <option value="active">Обучается</option>
                <option value="inactive">Не активен</option>
              </select>
            </div>

            <div className={`field ${fieldErrors.social_status_id ? 'has-error' : ''}`}>
              <span className="label">Социальный статус</span>
              <span className="value">{getSocialStatusLabel(student.social_status_id)}</span>
              <select 
                name="social_status_id" 
                value={editData.social_status_id || ''} 
                onChange={(e) => handleFieldChange('social_status_id', e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Не выбрано</option>
                {socialStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {fieldErrors.social_status_id && <span className="field-error">{fieldErrors.social_status_id}</span>}
            </div>

            {getSocialStatusCode(editData.social_status_id) === 'disabled' && (
              <div className={`field ${fieldErrors.disability_group ? 'has-error' : ''}`}>
                <span className="label">Группа инвалидности</span>
                <span className="value">{editData.disability_group || '—'}</span>
                <select name="disability_group" value={editData.disability_group || ''} onChange={(e) => handleFieldChange('disability_group', e.target.value)}>
                  {DISABILITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {fieldErrors.disability_group && <span className="field-error">{fieldErrors.disability_group}</span>}
              </div>
            )}

            <div className={`field ${fieldErrors.health_group_id ? 'has-error' : ''}`}>
              <span className="label">Группа здоровья</span>
              <span className="value">{getHealthGroupLabel(student.health_group_id)}</span>
              <select 
                name="health_group_id" 
                value={editData.health_group_id || ''} 
                onChange={(e) => handleFieldChange('health_group_id', e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Не выбрано</option>
                {healthGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {fieldErrors.health_group_id && <span className="field-error">{fieldErrors.health_group_id}</span>}
            </div>

            <div className={`field ${fieldErrors.inn ? 'has-error' : ''}`}>
              <span className="label">ИНН</span>
              <span className="value">{student.inn || '—'}</span>
              <input type="text" name="inn" value={editData.inn || ''} onChange={(e) => handleFieldChange('inn', e.target.value)} placeholder="12 цифр" />
              {fieldErrors.inn && <span className="field-error">{fieldErrors.inn}</span>}
            </div>
            <div className={`field ${fieldErrors.snils ? 'has-error' : ''}`}>
              <span className="label">СНИЛС</span>
              <span className="value">{student.snils || '—'}</span>
              <input type="text" name="snils" value={editData.snils || ''} onChange={(e) => handleFieldChange('snils', e.target.value)} placeholder="___-___-___ __" />
              {fieldErrors.snils && <span className="field-error">{fieldErrors.snils}</span>}
            </div>
            <div className="field">
              <span className="label">Мед. полис</span>
              <span className="value">{student.medical_policy || '—'}</span>
              <input type="text" name="medical_policy" value={editData.medical_policy || ''} onChange={(e) => handleFieldChange('medical_policy', e.target.value)} />
            </div>
          </div>
        </div>

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

      <div className="student-grid">
        <div className="left-column">
          <div className="card">
            <div className="card-header"><h3>Паспортные данные</h3></div>
            <div className="compact-row">
              <span className="view-field">{passportString()}</span>
              <div className="edit-field">
                <div className="info-grid">
                  <div className={`field ${fieldErrors.passport_series ? 'has-error' : ''}`}>
                    <span className="label">Серия</span>
                    <input type="text" name="passport_series" value={editData.passport_series || ''} onChange={(e) => handleFieldChange('passport_series', e.target.value)} placeholder="4 цифры" />
                    {fieldErrors.passport_series && <span className="field-error">{fieldErrors.passport_series}</span>}
                  </div>
                  <div className={`field ${fieldErrors.passport_number ? 'has-error' : ''}`}>
                    <span className="label">Номер</span>
                    <input type="text" name="passport_number" value={editData.passport_number || ''} onChange={(e) => handleFieldChange('passport_number', e.target.value)} placeholder="6 цифр" />
                    {fieldErrors.passport_number && <span className="field-error">{fieldErrors.passport_number}</span>}
                  </div>
                  <div className={`field ${fieldErrors.passport_issue_date ? 'has-error' : ''}`}>
                    <span className="label">Дата выдачи</span>
                    <input type="date" name="passport_issue_date" value={editData.passport_issue_date || ''} onChange={(e) => handleFieldChange('passport_issue_date', e.target.value)} />
                    {fieldErrors.passport_issue_date && <span className="field-error">{fieldErrors.passport_issue_date}</span>}
                  </div>
                  <div className={`field ${fieldErrors.passport_issued_by ? 'has-error' : ''}`} style={{ gridColumn: 'span 2' }}>
                    <span className="label">Кем выдан</span>
                    <input type="text" name="passport_issued_by" value={editData.passport_issued_by || ''} onChange={(e) => handleFieldChange('passport_issued_by', e.target.value)} />
                    {fieldErrors.passport_issued_by && <span className="field-error">{fieldErrors.passport_issued_by}</span>}
                  </div>
                  <div className={`field ${fieldErrors.passport_department_code ? 'has-error' : ''}`}>
                    <span className="label">Код подразделения</span>
                    <input type="text" name="passport_department_code" value={editData.passport_department_code || ''} onChange={(e) => handleFieldChange('passport_department_code', e.target.value)} placeholder="___-___" />
                    {fieldErrors.passport_department_code && <span className="field-error">{fieldErrors.passport_department_code}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Адреса</h3>
              {isEditMode && (
                <button type="button" className="copy-address-btn" onClick={copyRegistrationAddress}>
                  Фактический адрес совпадает с пропиской
                </button>
              )}
            </div>
            <div className="compact-row">
              <span className="view-field"><span className="label">Прописка:</span> {addressString('registration')}</span>
              <div className="edit-field">
                <div className="address-block">
                  <h4>📍 Адрес по прописке</h4>
                  <div className="info-grid">
                    <div className={`field ${fieldErrors.registration_region ? 'has-error' : ''}`}>
                      <span className="label">Область</span>
                      <input type="text" name="registration_region" value={editData.registration_region || ''} onChange={(e) => handleFieldChange('registration_region', e.target.value)} />
                      {fieldErrors.registration_region && <span className="field-error">{fieldErrors.registration_region}</span>}
                    </div>
                    <div className={`field ${fieldErrors.registration_city ? 'has-error' : ''}`}>
                      <span className="label">Город</span>
                      <input type="text" name="registration_city" value={editData.registration_city || ''} onChange={(e) => handleFieldChange('registration_city', e.target.value)} />
                      {fieldErrors.registration_city && <span className="field-error">{fieldErrors.registration_city}</span>}
                    </div>
                    <div className="field">
                      <span className="label">Улица</span>
                      <input type="text" name="registration_street" value={editData.registration_street || ''} onChange={(e) => handleFieldChange('registration_street', e.target.value)} />
                    </div>
                    <div className={`field ${fieldErrors.registration_house ? 'has-error' : ''}`}>
                      <span className="label">Дом</span>
                      <input type="text" name="registration_house" value={editData.registration_house || ''} onChange={(e) => handleFieldChange('registration_house', e.target.value)} />
                      {fieldErrors.registration_house && <span className="field-error">{fieldErrors.registration_house}</span>}
                    </div>
                    <div className="field">
                      <span className="label">Квартира</span>
                      <input type="text" name="registration_apartment" value={editData.registration_apartment || ''} onChange={(e) => handleFieldChange('registration_apartment', e.target.value)} />
                    </div>
                    <div className={`field ${fieldErrors.registration_zip ? 'has-error' : ''}`}>
                      <span className="label">Индекс</span>
                      <input type="text" name="registration_zip" value={editData.registration_zip || ''} onChange={(e) => handleFieldChange('registration_zip', e.target.value)} placeholder="6 цифр" />
                      {fieldErrors.registration_zip && <span className="field-error">{fieldErrors.registration_zip}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="compact-row" style={{ borderBottom: 'none' }}>
              <span className="view-field"><span className="label">Фактический:</span> {addressString('actual')}</span>
              <div className="edit-field">
                <div className="address-block">
                  <h4>📍 Фактический адрес</h4>
                  <div className="info-grid">
                    <div className={`field ${fieldErrors.actual_region ? 'has-error' : ''}`}>
                      <span className="label">Область</span>
                      <input type="text" name="actual_region" value={editData.actual_region || ''} onChange={(e) => handleFieldChange('actual_region', e.target.value)} />
                      {fieldErrors.actual_region && <span className="field-error">{fieldErrors.actual_region}</span>}
                    </div>
                    <div className={`field ${fieldErrors.actual_city ? 'has-error' : ''}`}>
                      <span className="label">Город</span>
                      <input type="text" name="actual_city" value={editData.actual_city || ''} onChange={(e) => handleFieldChange('actual_city', e.target.value)} />
                      {fieldErrors.actual_city && <span className="field-error">{fieldErrors.actual_city}</span>}
                    </div>
                    <div className="field">
                      <span className="label">Улица</span>
                      <input type="text" name="actual_street" value={editData.actual_street || ''} onChange={(e) => handleFieldChange('actual_street', e.target.value)} />
                    </div>
                    <div className={`field ${fieldErrors.actual_house ? 'has-error' : ''}`}>
                      <span className="label">Дом</span>
                      <input type="text" name="actual_house" value={editData.actual_house || ''} onChange={(e) => handleFieldChange('actual_house', e.target.value)} />
                      {fieldErrors.actual_house && <span className="field-error">{fieldErrors.actual_house}</span>}
                    </div>
                    <div className="field">
                      <span className="label">Квартира</span>
                      <input type="text" name="actual_apartment" value={editData.actual_apartment || ''} onChange={(e) => handleFieldChange('actual_apartment', e.target.value)} />
                    </div>
                    <div className={`field ${fieldErrors.actual_zip ? 'has-error' : ''}`}>
                      <span className="label">Индекс</span>
                      <input type="text" name="actual_zip" value={editData.actual_zip || ''} onChange={(e) => handleFieldChange('actual_zip', e.target.value)} placeholder="6 цифр" />
                      {fieldErrors.actual_zip && <span className="field-error">{fieldErrors.actual_zip}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Состав семьи</h3></div>
            <FamilyTable 
              members={familyMembers} 
              isEditMode={isEditMode} 
              onAdd={handleAddFamily} 
              onDelete={handleDeleteFamily} 
              onUpdate={handleUpdateFamily}
            />
          </div>
        </div>

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
                      <span className={`tag ${a.type || 'academic'}`}>{a.type === 'academic' ? 'Учебное' : a.type === 'sport' ? 'Спортивное' : 'Творческое'}</span>
                      {isEditMode && <button className="delete-item" onClick={() => handleDeleteItem('achievement', a.id)}>✕</button>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#7a8a9e', fontSize: '13px', padding: '8px 0' }}>Нет достижений</div>
            )}
          </div>

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

      <ConfirmModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} />
      <AddModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} type={addModalType} onAdd={(data) => { handleAddItem(addModalType, data); setShowAddModal(false) }} />
    </div>
  )
}

export default StudentDetail