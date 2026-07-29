import React, { createContext, useState, useEffect, useContext } from 'react'
import api from '../api/client'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Загрузка пользователя при старте
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    console.log('🔍 AuthProvider инициализация:', {
      hasToken: !!token,
      hasUser: !!storedUser,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
    })

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser.role !== undefined) {
          parsedUser.role = Number(parsedUser.role)
        }
        console.log('✅ AuthProvider загрузил пользователя:', parsedUser)
        setUser(parsedUser)
      } catch (err) {
        console.error('❌ Ошибка парсинга user из localStorage:', err)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        setUser(null)
      }
    } else {
      console.log('⚠️ Нет данных авторизации в localStorage')
    }
    setLoading(false)
  }, [])

  // Функция входа
  const login = async (email, password) => {
    setError(null)
    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token, refresh_token, user_id, full_name, role } = response.data

      const userData = {
        id: user_id,
        full_name,
        role: Number(role),
      }

      console.log('✅ Успешный вход, сохраняем пользователя:', userData)

      // Очищаем старые данные перед сохранением новых
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')

      // Сохраняем новые данные
      localStorage.setItem('token', access_token)
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token)
      }
      localStorage.setItem('user', JSON.stringify(userData))

      // Обновляем состояние
      setUser(userData)

      return { success: true, user: userData }
    } catch (err) {
      const message = err.response?.data?.detail || 'Ошибка входа'
      console.error('❌ Ошибка входа:', err)
      setError(typeof message === 'string' ? message : 'Ошибка входа')
      return { success: false, error: typeof message === 'string' ? message : 'Ошибка входа' }
    }
  }

  // Функция выхода
  const logout = () => {
    console.log('🚪 Выход из системы')
    setUser(null)
    setError(null)
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider')
  }
  return context
}