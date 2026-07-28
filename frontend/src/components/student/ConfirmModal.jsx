import React from 'react'
import Button from '../common/Button'
import './ConfirmModal.css'

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title || 'Подтверждение'}</h3>
          <button className="confirm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="confirm-modal-body">
          <p>{message || 'Вы уверены?'}</p>
        </div>
        <div className="confirm-modal-footer">
          <Button variant="cancel" onClick={onClose}>Отмена</Button>
          <Button variant="danger" onClick={onConfirm}>Удалить</Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal