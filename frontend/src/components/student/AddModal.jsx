import React, { useState } from 'react'
import Button from '../common/Button'
import './AddModal.css'

const AddModal = ({ isOpen, onClose, type, onAdd }) => {
  const [formData, setFormData] = useState({ name: '', date: '', type: 'academic', result: '', file: null })

  if (!isOpen) return null

  const titles = {
    achievement: 'Добавить достижение',
    contest: 'Добавить конкурс',
    document: 'Загрузить документ'
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Введите название')
      return
    }
    onAdd(formData)
    setFormData({ name: '', date: '', type: 'academic', result: '', file: null })
  }

  return (
    <div className="add-modal-overlay" onClick={onClose}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-modal-header">
          <h3>{titles[type] || 'Добавить'}</h3>
          <button className="add-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="add-modal-body">
          <div className="form-group">
            <label>Название</label>
            <input type="text" placeholder="Введите название" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Дата</label>
            <input type="date" value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
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
          {(type === 'achievement' || type === 'contest' || type === 'document') && (
            <div className="form-group">
              <label>Файл (PDF, JPG, JPEG)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg"
                onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })} />
            </div>
          )}
        </div>
        <div className="add-modal-footer">
          <Button variant="cancel" onClick={onClose}>Отмена</Button>
          <Button variant="primary" onClick={handleSubmit}>Добавить</Button>
        </div>
      </div>
    </div>
  )
}

export default AddModal