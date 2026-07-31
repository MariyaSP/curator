import React, { useState, useEffect } from 'react'
import Button from '../common/Button'
import api from '../../api/client'
import './AddModal.css'

const AddModal = ({ isOpen, onClose, type, onAdd }) => {
  const [formData, setFormData] = useState({ name: '', date: '', type: 'academic', result: '', file: null, documentTypeId: '' })
  const [documentTypes, setDocumentTypes] = useState([])

  // 🟢 Загружаем справочник типов документов при открытии модалки
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

  if (!isOpen) return null

  const titles = {
    achievement: 'Добавить достижение',
    contest: 'Добавить конкурс',
    document: 'Загрузить документ'
  }

  const handleSubmit = () => {
    // 🟢 Для документов проверяем выбранный тип и файл
    if (type === 'document') {
      if (!formData.documentTypeId) {
        alert('Выберите тип документа')
        return
      }
      if (!formData.file) {
        alert('Выберите файл')
        return
      }
    } else {
      if (!formData.name.trim()) {
        alert('Введите название')
        return
      }
    }
    onAdd(formData)
    setFormData({ name: '', date: '', type: 'academic', result: '', file: null, documentTypeId: '' })
  }

  return (
    <div className="add-modal-overlay" onClick={onClose}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-modal-header">
          <h3>{titles[type] || 'Добавить'}</h3>
          <button className="add-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="add-modal-body">
          
          {/* 🟢 Документ: селект с типами вместо текстового поля */}
          {type === 'document' ? (
            <div className="form-group">
              <label>Тип документа *</label>
              <select
                value={formData.documentTypeId}
                onChange={(e) => setFormData({ ...formData, documentTypeId: e.target.value })}
              >
                <option value="">Выберите тип</option>
                {documentTypes.map(dt => (
                  <option key={dt.id} value={dt.id}>{dt.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Название</label>
              <input type="text" placeholder="Введите название" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
          )}

          {/* Дата только для достижений и конкурсов */}
          {type !== 'document' && (
            <div className="form-group">
              <label>Дата</label>
              <input type="date" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
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
          {type === 'contest' && (
            <div className="form-group">
              <label>Результат</label>
              <input type="text" placeholder="Например: 1 место" value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })} />
            </div>
          )}

          {/* Файл для всех трёх типов */}
          <div className="form-group">
            <label>
              {type === 'document' ? 'Файл * (PDF, JPG, PNG)' : 'Файл (PDF, JPG, PNG)'}
            </label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })} />
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