import React, { useState } from 'react'
import Button from '../common/Button'
import ConfirmModal from './ConfirmModal'
import './FamilyTable.css'

const FamilyTable = ({ members, isEditMode, onAdd, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [newMember, setNewMember] = useState({
    full_name: '',
    relationship: 'отец',
    birth_date: '',
    phone: ''
  })

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

  const handleAdd = () => {
    if (!newMember.full_name.trim()) {
      alert('Введите ФИО')
      return
    }
    if (!newMember.phone.trim()) {
      alert('Введите телефон')
      return
    }
    onAdd(newMember)
    setNewMember({ full_name: '', relationship: 'отец', birth_date: '', phone: '' })
  }

  return (
    <div className="family-table-container">
      <table className="family-table">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Степень родства</th>
            <th>Дата рождения</th>
            <th>Телефон</th>
            {isEditMode && <th style={{ width: '30px' }}></th>}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                <span className="family-value">{member.full_name}</span>
                {isEditMode && <input className="family-input" type="text" defaultValue={member.full_name} />}
              </td>
              <td>
                <span className="family-value">{member.relationship}</span>
                {isEditMode && (
                  <select className="family-input" defaultValue={member.relationship}>
                    <option value="мать">мать</option>
                    <option value="отец">отец</option>
                    <option value="брат">брат</option>
                    <option value="сестра">сестра</option>
                    <option value="бабушка">бабушка</option>
                    <option value="дедушка">дедушка</option>
                    <option value="опекун">опекун</option>
                  </select>
                )}
              </td>
              <td>
                <span className="family-value">{member.birth_date}</span>
                {isEditMode && <input className="family-input" type="date" defaultValue={member.birth_date} />}
              </td>
              <td>
                <span className="family-value">{member.phone}</span>
                {isEditMode && <input className="family-input" type="text" defaultValue={member.phone} />}
              </td>
              {isEditMode && (
                <td>
                  <button className="delete-item" onClick={() => handleDeleteClick(member.id)}>✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isEditMode && (
        <div className="add-family-row">
          <input type="text" placeholder="ФИО" value={newMember.full_name}
            onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })} />
          <select value={newMember.relationship}
            onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}>
            <option value="мать">мать</option>
            <option value="отец">отец</option>
            <option value="брат">брат</option>
            <option value="сестра">сестра</option>
            <option value="бабушка">бабушка</option>
            <option value="дедушка">дедушка</option>
            <option value="опекун">опекун</option>
          </select>
          <input type="date" value={newMember.birth_date}
            onChange={(e) => setNewMember({ ...newMember, birth_date: e.target.value })} />
          <input type="text" placeholder="Телефон" value={newMember.phone}
            onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
          <Button variant="primary" onClick={handleAdd}>➕</Button>
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