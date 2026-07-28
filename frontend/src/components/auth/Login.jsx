import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/client'
import styles from './Login.module.css'

const Login = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const hasRedirected = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ===== РЕДИРЕКТ, ЕСЛИ УЖЕ АВТОРИЗОВАН =====
  useEffect(() => {
    // Если уже перенаправляли — выходим
    if (hasRedirected.current) return

    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user)
        const role = parsedUser.role

        // Помечаем, что редирект выполняется
        hasRedirected.current = true

        if (role === 1) {
          navigate('/admin', { replace: true })
        } else if (role === 2) {
          navigate('/curator', { replace: true })
        } else if (role === 3) {
          navigate('/student', { replace: true })
        } else {
          navigate('/login', { replace: true })
          hasRedirected.current = false
        }
      } catch {
        // если данные битые — остаёмся на логине
        hasRedirected.current = false
      }
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
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

      const { access_token, user_id, full_name, role } = response.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify({ id: user_id, full_name, role }))

      // Сбрасываем флаг, чтобы при перезагрузке страницы редирект сработал
      hasRedirected.current = false

      if (role === 1) {
        navigate('/admin', { replace: true })
      } else if (role === 2) {
        navigate('/curator', { replace: true })
      } else if (role === 3) {
        navigate('/student', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Ошибка входа'
      setError(typeof message === 'string' ? message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
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

          {error && (
            <div
              style={{
                color: '#ff6b6b',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              {error}
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
    </div>
  )
}

export default Login