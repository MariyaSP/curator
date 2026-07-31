import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, logout } = useAuth()
  const [isTokenValid, setIsTokenValid] = useState(null)  // null = проверяем, true = ок, false = нет

  // 🟢 ДОБАВЛЕНО: проверка токена через /auth/me при монтировании
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsTokenValid(false)
        return
      }

      try {
        // Стучимся на эндпоинт, который точно требует авторизацию
        // Если бэкенд вернёт 401 — interceptor сам редиректнет
        await api.get('/auth/me')
        setIsTokenValid(true)
      } catch (err) {
        console.log('🔴 Токен невалиден:', err.response?.status)
        setIsTokenValid(false)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    verifyToken()
  }, [])

  if (loading || isTokenValid === null) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>Загрузка...</div>
  }

  if (!user || !isTokenValid) {
    console.log('❌ Нет доступа, редирект на логин')
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