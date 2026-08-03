import React, { useState, useEffect } from 'react'
import Button from '../common/Button'
import api from '../../api/client'
import './AddModal.css'

const AddModal = ({ isOpen, onClose, type, onAdd }) => {
  const [formData, setFormData] = useState({ name: '', date: '', type: 'academic', result: '', file: null, documentTypeId: '' })
  const [documentTypes, setDocumentTypes] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (isOpen && type === 'document') {
      const fetchTypes = async () => {
        try {
          const res = await api.get('/students/references/document-types')
          setDocumentTypes(res.data)
        } catch (err) {
          console.error('Ошибка загрузки типов документов:', err)
        }
      }
      fetchTypes()
    }
  }, [isOpen, type])

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      setSubmitError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const titles = {
    achievement: 'Добавить достижение',
    document: 'Загрузить документ'
  }

  const validate = () => {
    const newErrors = {}
    
    if (type === 'document') {
      if (!formData.documentTypeId) newErrors.documentTypeId = 'Выберите тип документа'
      if (!formData.file) newErrors.file = 'Выберите файл'
    } else if (type === 'achievement') {
      if (!formData.name.trim()) newErrors.name = 'Введите название'
      if (!formData.date) newErrors.date = 'Выберите дату'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    
    try {
      onAdd(formData)
      setFormData({ name: '', date: '', type: 'academic', result: '', file: null, documentTypeId: '' })
      setErrors({})
    } catch (err) {
      setSubmitError('Не удалось добавить')
    }
  }

  const clearError = (field) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="add-modal-overlay" onClick={onClose}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-modal-header">
          <h3>{titles[type] || 'Добавить'}</h3>
          <button className="add-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="add-modal-body">
          
          {submitError && (
            <div className="form-error-banner" style={{ marginBottom: '12px' }}>{submitError}</div>
          )}

          {type === 'document' ? (
            <div className={`form-group ${errors.documentTypeId ? 'has-error' : ''}`}>
              <label>Тип документа *</label>
              <select
                value={formData.documentTypeId}
                onChange={(e) => {
                  setFormData({ ...formData, documentTypeId: e.target.value })
                  clearError('documentTypeId')
                }}
              >
                <option value="">Выберите тип</option>
                {documentTypes.map(dt => (
                  <option key={dt.id} value={dt.id}>{dt.name}</option>
                ))}
              </select>
              {errors.documentTypeId && <span className="field-error">{errors.documentTypeId}</span>}
            </div>
          ) : (
            <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
              <label>Название *</label>
              <input
                type="text"
                placeholder="Введите название"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  clearError('name')
                }}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
          )}

          {type === 'achievement' && (
            <div className={`form-group ${errors.date ? 'has-error' : ''}`}>
              <label>Дата *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value })
                  clearError('date')
                }}
              />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </div>
          )}

          {type === 'achievement' && (
            <div className="form-group">
              <label>Тип</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="academic">Учебное</option>
                <option value="sport">Спортивное</option>
                <option value="creative">Творческое</option>
              </select>
            </div>
          )}

          <div className={`form-group ${errors.file ? 'has-error' : ''}`}>
            <label>
              {type === 'document' ? 'Файл * (PDF, JPG, PNG)' : 'Файл (PDF, JPG, PNG)'}
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                setFormData({ ...formData, file: e.target.files[0] })
                clearError('file')
              }}
            />
            {errors.file && <span className="field-error">{errors.file}</span>}
          </div>
        </div>
        <div className="add-modal-footer">
          <Button variant="cancel" onClick={onClose}>Отмена</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {type === 'document' ? 'Загрузить' : 'Добавить'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AddModal