import React from 'react'
import './StudentCard.css'

const StudentCard = ({ student, onClick }) => {
  // Формируем URL для фото (если есть)
  const photoUrl = student.photo 
    ? `http://localhost:8000${student.photo}` 
    : null

  return (
    <div className="student-card" onClick={() => onClick(student.id)}>
      <div className="student-card-photo">
        {photoUrl ? (
          <img src={photoUrl} alt={student.full_name} />
        ) : (
          <div className="student-card-avatar">👤</div>
        )}
      </div>
      <div className="student-card-info">
        <div className="student-card-number">№ {student.personal_number}</div>
        <div className="student-card-name">{student.full_name}</div>
        <div className="student-card-details">
          <span>📅 {student.birth_date ? new Date(student.birth_date).toLocaleDateString() : '—'}</span>
          <span>📞 {student.phone || '—'}</span>
          <span>✉️ {student.email || '—'}</span>
        </div>
      </div>
    </div>
  )
}

export default StudentCard