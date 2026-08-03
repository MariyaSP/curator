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
    description: '',
    result_type: '',
    result_description: '',
    file: null,
  })

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
      description: '',
      result_type: '',
      result_description: '',
      file: null,
    })
    setSelectedCurator(null)
    setSearchCurator('')
    setShowCuratorList(false)
    setShowTitleSuggestions(false)
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
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) { alert('Введите название конкурса'); return }
    if (!formData.competition_date) { alert('Выберите дату конкурса'); return }
    if (!selectedCurator) { alert('Выберите преподавателя-наставника'); return }
    if (!collegeId || !academicYearId) { alert('Не удалось загрузить данные. Попробуйте позже.'); return }

    setLoading(true)
    try {
      const compRes = await api.post('/competitions/', {
        title: formData.title,
        description: formData.description || '',
        competition_date: formData.competition_date,
        format: formData.format,
        scope: formData.scope,
        curator_id: selectedCurator.id,
        college_id: collegeId,
        academic_year_id: academicYearId,
      })

      await api.post('/competitions/participants', {
        competition_id: compRes.data.id,
        student_id: studentId,
        result_type: formData.result_type || null,
        result_description: formData.result_description || null,
        })
    //   const fd = new FormData()
    //   fd.append('competition_id', compRes.data.id)
    //   fd.append('student_id', studentId)
    //   if (formData.result_type) fd.append('result_type', formData.result_type)
    //   if (formData.result_description) fd.append('result_description', formData.result_description)
    //   if (formData.file) fd.append('file', formData.file)

    //   await api.post('/competitions/participants', fd, {
    //     headers: { 'Content-Type': 'multipart/form-data' }
    //   })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Ошибка добавления конкурса:', err)
      alert(err.response?.data?.detail || 'Не удалось добавить конкурс')
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
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Название конкурса *</label>
            <input
              type="text"
              placeholder="Введите название конкурса"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onFocus={() => formData.title.trim() && titleSuggestions.length > 0 && setShowTitleSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
              autoFocus
            />
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

          <div className="form-group">
            <label>Дата конкурса *</label>
            <input
              type="date"
              value={formData.competition_date}
              onChange={(e) => setFormData({ ...formData, competition_date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Формат</label>
            <select value={formData.format} onChange={(e) => setFormData({ ...formData, format: e.target.value })}>
              <option value="OFFLINE">Очный</option>
              <option value="ONLINE">Заочный</option>
            </select>
          </div>

          <div className="form-group">
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

          <div className="form-group" style={{ position: 'relative' }}>
            <label>Преподаватель-наставник *</label>
            <input
              type="text"
              placeholder="Поиск преподавателя"
              value={searchCurator}
              onChange={(e) => handleSearchCurator(e.target.value)}
              onFocus={() => setShowCuratorList(true)}
              onBlur={() => setTimeout(() => setShowCuratorList(false), 200)}
            />
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
                {curators.length === 0 && (
                  <div className="suggestion-item" style={{ color: '#7a8a9e', cursor: 'default' }}>
                    Ничего не найдено
                  </div>
                )}
              </div>
            )}
            {selectedCurator && (
              <div style={{ fontSize: '12px', color: '#0f6b3a', marginTop: '4px' }}>
                ✓ Выбран: {selectedCurator.full_name}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea
              rows="2"
              placeholder="Дополнительная информация о конкурсе"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

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

          <div className="form-group">
            <label>Описание результата</label>
            <input
              type="text"
              placeholder="Например: 1 место"
              value={formData.result_description}
              onChange={(e) => setFormData({ ...formData, result_description: e.target.value })}
            />
          </div>

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