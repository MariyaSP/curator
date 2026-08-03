// frontend/src/components/student/AddCompetitionModal.jsx

import React, { useState, useEffect } from 'react'
import Button from '../common/Button'
import api from '../../api/client'
import './AddModal.css'

const AddCompetitionModal = ({ isOpen, onClose, studentId, onSuccess }) => {
  const [curators, setCurators] = useState([])
  const [searchCurator, setSearchCurator] = useState('')
  const [selectedCurator, setSelectedCurator] = useState(null)

  const [existingCompetitions, setExistingCompetitions] = useState([])
  const [titleSuggestions, setTitleSuggestions] = useState([])

  const [collegeId, setCollegeId] = useState(null)
  const [academicYearId, setAcademicYearId] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    competition_date: '',
    format: 'OFFLINE',
    scope: 'INTERNAL',
    result_type: '',
    file: null,
  })

  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCuratorList, setShowCuratorList] = useState(false)
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)

  useEffect(() => {
    if (isOpen && studentId) {
      resetForm()
      loadCurators('')
      loadExistingTitles()
      loadStudentIds()
    }
  }, [isOpen, studentId])

  const resetForm = () => {
    setFormData({
      title: '',
      competition_date: '',
      format: 'OFFLINE',
      scope: 'INTERNAL',
      result_type: '',
      file: null,
    })
    setSelectedCurator(null)
    setSearchCurator('')
    setShowCuratorList(false)
    setShowTitleSuggestions(false)
    setErrors({})
    setSubmitError('')
  }

  const loadStudentIds = async () => {
    try {
      const res = await api.get(`/students/${studentId}`)
      setCollegeId(res.data.college_id)
      setAcademicYearId(res.data.academic_year_id)
    } catch (err) {
      console.error('Ошибка загрузки данных студента:', err)
    }
  }

  const loadCurators = async (search) => {
    try {
      const res = await api.get('/students/references/curators', { params: { search } })
      setCurators(res.data)
    } catch (err) {
      console.error('Ошибка загрузки преподавателей:', err)
    }
  }

  const loadExistingTitles = async () => {
    try {
      const res = await api.get('/competitions/')
      const titles = [...new Set(res.data.map(c => c.title))]
      setExistingCompetitions(titles)
    } catch (err) {
      console.error('Ошибка загрузки конкурсов:', err)
    }
  }

  const handleTitleChange = (value) => {
    setFormData({ ...formData, title: value })
    if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
    if (value.trim().length > 0) {
      const filtered = existingCompetitions.filter(t =>
        t.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
      setTitleSuggestions(filtered)
      setShowTitleSuggestions(filtered.length > 0)
    } else {
      setTitleSuggestions([])
      setShowTitleSuggestions(false)
    }
  }

  const handleSelectTitle = (title) => {
    setFormData({ ...formData, title })
    setShowTitleSuggestions(false)
  }

  const handleSearchCurator = (value) => {
    setSearchCurator(value)
    setShowCuratorList(true)
    loadCurators(value)
  }

  const handleSelectCurator = (curator) => {
    setSelectedCurator(curator)
    setSearchCurator(curator.full_name)
    setShowCuratorList(false)
    if (errors.curator) setErrors(prev => ({ ...prev, curator: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Введите название конкурса'
    if (!formData.competition_date) newErrors.competition_date = 'Выберите дату конкурса'
    if (!selectedCurator) newErrors.curator = 'Выберите преподавателя-наставника'
    if (!collegeId || !academicYearId) newErrors.submit = 'Не удалось загрузить данные колледжа'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    setSubmitError('')
    try {
      const compRes = await api.post('/competitions/', {
        title: formData.title,
        competition_date: formData.competition_date,
        format: formData.format,
        scope: formData.scope,
        college_id: collegeId,
        academic_year_id: academicYearId,
      })

      const participantRes = await api.post('/competitions/participants', {
        competition_id: compRes.data.id,
        student_id: studentId,
        curator_id: selectedCurator.id,
        result_type: formData.result_type || null,
      })

      if (formData.file && participantRes.data.id) {
        const fd = new FormData()
        fd.append('file', formData.file)
        await api.post(`/students/${studentId}/competitions/${participantRes.data.id}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Ошибка добавления конкурса:', err)
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setSubmitError(detail)
      } else if (Array.isArray(detail)) {
        setSubmitError(detail.map(d => d.msg).join('; '))
      } else {
        setSubmitError('Не удалось добавить конкурс')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="add-modal-overlay" onClick={onClose}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="add-modal-header">
          <h3>Добавить конкурс</h3>
          <button className="add-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="add-modal-body">
          {submitError && (
            <div className="form-error-banner" style={{ marginBottom: '12px' }}>{submitError}</div>
          )}

          {/* Название */}
          <div className={`form-group ${errors.title ? 'has-error' : ''}`} style={{ position: 'relative' }}>
            <label>Название конкурса *</label>
            <input
              type="text"
              placeholder="Введите название"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
              autoFocus
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
            {showTitleSuggestions && (
              <div className="suggestions-dropdown">
                {titleSuggestions.map((t, i) => (
                  <div key={i} className="suggestion-item" onMouseDown={() => handleSelectTitle(t)}>
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Дата + Формат + Уровень */}
          <div className="form-group-special">
            <div className={`form-group ${errors.competition_date ? 'has-error' : ''}`} style={{ flex: 1 }}>
              <label>Дата *</label>
              <input
                type="date"
                value={formData.competition_date}
                onChange={(e) => {
                  setFormData({ ...formData, competition_date: e.target.value })
                  if (errors.competition_date) setErrors(prev => ({ ...prev, competition_date: '' }))
                }}
              />
              {errors.competition_date && <span className="field-error">{errors.competition_date}</span>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Формат</label>
              <select value={formData.format} onChange={(e) => setFormData({ ...formData, format: e.target.value })}>
                <option value="OFFLINE">Очный</option>
                <option value="ONLINE">Заочный</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Уровень</label>
              <select value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })}>
                <option value="INTERNAL">Внутренний</option>
                <option value="CITY">Городской</option>
                <option value="REGIONAL">Региональный</option>
                <option value="OBLAST">Областной</option>
                <option value="INTERREGIONAL">Межрегиональный</option>
                <option value="NATIONAL">Всероссийский</option>
                <option value="INTERNATIONAL">Международный</option>
              </select>
            </div>
          </div>

          {/* Наставник */}
          <div className={`form-group ${errors.curator ? 'has-error' : ''}`} style={{ position: 'relative' }}>
            <label>Преподаватель-наставник *</label>
            <input
              type="text"
              placeholder="Поиск преподавателя"
              value={searchCurator}
              onChange={(e) => handleSearchCurator(e.target.value)}
              onBlur={() => setTimeout(() => setShowCuratorList(false), 200)}
            />
            {errors.curator && <span className="field-error">{errors.curator}</span>}
            {showCuratorList && (
              <div className="suggestions-dropdown">
                {curators.map(c => (
                  <div
                    key={c.id}
                    className={`suggestion-item ${selectedCurator?.id === c.id ? 'selected' : ''}`}
                    onMouseDown={() => handleSelectCurator(c)}
                  >
                    {c.full_name}
                  </div>
                ))}
              </div>
            )}
            {selectedCurator && (
              <div style={{ fontSize: '12px', color: '#0f6b3a', marginTop: '4px' }}>
                ✓ Выбран: {selectedCurator.full_name}
              </div>
            )}
          </div>

          {/* Результат */}
          <div className="form-group">
            <label>Результат</label>
            <select value={formData.result_type} onChange={(e) => setFormData({ ...formData, result_type: e.target.value })}>
              <option value="">Выберите результат</option>
              <option value="VICTORY">Победитель</option>
              <option value="PRIZE">Призёр</option>
              <option value="PARTICIPATION">Участник</option>
              <option value="DIPLOMA">Дипломант</option>
            </select>
          </div>

          {/* Файл */}
          <div className="form-group">
            <label>Файл (диплом, сертификат)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
            />
          </div>
        </div>

        <div className="add-modal-footer">
          <Button variant="cancel" onClick={onClose}>Отмена</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Сохранение...' : 'Добавить конкурс'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AddCompetitionModal