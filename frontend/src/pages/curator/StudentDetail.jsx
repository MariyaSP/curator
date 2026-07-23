import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'

const StudentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/${id}`)
        setStudent(res.data)
      } catch (err) {
        console.error('Ошибка загрузки студента:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [id])

  if (loading) return <div>Загрузка...</div>
  if (!student) return <div>Студент не найден</div>

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px' }}>
      <button onClick={() => navigate('/curator/students')} style={{ marginBottom: '16px' }}>
        ← Назад к списку
      </button>
      <h1>{student.full_name}</h1>
      <p>Номер: {student.personal_number}</p>
      <p>Дата рождения: {student.birth_date}</p>
      <p>Телефон: {student.phone}</p>
      <p>Email: {student.email}</p>
      <p>Группа: {student.group_name}</p>
      <p>Статус: {student.social_status_id}</p>
      {/* Здесь будет полная карточка студента */}
    </div>
  )
}

export default StudentDetail