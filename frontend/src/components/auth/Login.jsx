import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import api from '../../api/client'
import styles from './Login.module.css'

const Login = () => {
  const { theme } = useTheme()
  const { login, error } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setLocalError(null)

    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token, user_id, full_name, role } = response.data

      const userData = { id: user_id, full_name, role }
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))

      if (role === 1) navigate('/admin')
      else if (role === 2) navigate('/curator')
      else if (role === 3) navigate('/student')
      else navigate('/login')
    } catch (err) {
      const message = err.response?.data?.detail || 'Ошибка входа'
      setLocalError(typeof message === 'string' ? message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const displayError = localError || error

  return (
    <div
      className={styles.loginContainer}
      style={{
        background: theme.colors.cardBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: theme.radii.card,
        border: `1px solid ${theme.colors.cardBorder}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        padding: theme.spacing.card,
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}
    >
      <h1
        className={styles.systemTitle}
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fonts.title,
        }}
      >
        Куратор
      </h1>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fonts.label,
            }}
          >
            Электронная почта
          </label>
          <div
            className={styles.inputWrapper}
            style={{
              borderBottom: `1.5px solid ${theme.colors.inputBorder}`,
            }}
          >
            <span className={styles.icon} style={{ color: theme.colors.textMuted }}>
              <i className="fas fa-envelope"></i>
            </span>
            <input
              type="email"
              placeholder="example@college.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.fonts.input,
              }}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fonts.label,
            }}
          >
            Пароль
          </label>
          <div
            className={styles.inputWrapper}
            style={{
              borderBottom: `1.5px solid ${theme.colors.inputBorder}`,
            }}
          >
            <span className={styles.icon} style={{ color: theme.colors.textMuted }}>
              <i className="fas fa-lock"></i>
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.fonts.input,
              }}
            />
          </div>
        </div>

        {displayError && (
          <div
            style={{
              color: '#ff6b6b',
              fontSize: '14px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            {typeof displayError === 'string' ? displayError : 'Ошибка входа'}
          </div>
        )}

        <div className={styles.actionRow}>
          <button
            type="submit"
            className={styles.btnLogin}
            disabled={loading}
            style={{
              background: theme.colors.btnBg,
              color: theme.colors.btnText,
              borderRadius: theme.radii.btn,
              fontSize: theme.fonts.btn,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
          <a
            href="#"
            className={styles.forgotPassword}
            style={{
              color: theme.colors.link,
              fontSize: theme.fonts.link,
            }}
          >
            Забыли пароль?
          </a>
        </div>
      </form>
    </div>
  )
}

export default Login