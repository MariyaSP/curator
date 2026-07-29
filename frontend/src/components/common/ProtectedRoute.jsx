import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth()

  console.log('🔒 ProtectedRoute:', { user, loading, allowedRoles })  // 👈 ДОБАВЬ ДЛЯ ОТЛАДКИ

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>Загрузка...</div>
  }

  if (!user) {
    console.log('❌ Нет пользователя, редирект на логин')
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log(`❌ Роль ${user.role} не входит в разрешённые:`, allowedRoles)
    return <Navigate to="/login" replace />
  }

  console.log('✅ Доступ разрешён')
  return children
}

export default ProtectedRoute