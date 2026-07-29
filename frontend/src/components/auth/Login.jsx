import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import styles from './Login.module.css'

const Login = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { user, loading: authLoading, login, error: authError } = useAuth()
  const hasRedirected = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)

  // ===== РЕДИРЕКТ, ЕСЛИ УЖЕ АВТОРИЗОВАН =====
  useEffect(() => {
    console.log('🔍 Login проверяет авторизацию:', {
      authLoading,
      hasUser: !!user,
      userRole: user?.role,
      hasRedirected: hasRedirected.current,
    })

    if (!authLoading && user && !hasRedirected.current) {
      hasRedirected.current = true
      console.log('✅ Пользователь уже авторизован, роль:', user.role)

      switch (user.role) {
        case 1:
          navigate('/admin', { replace: true })
          break
        case 2:
          navigate('/curator', { replace: true })
          break
        case 3:
          navigate('/student', { replace: true })
          break
        default:
          console.warn('⚠️ Неизвестная роль:', user.role)
          navigate('/login', { replace: true })
      }
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)

    console.log('🔐 Попытка входа:', email)

    const result = await login(email, password)

    if (result.success) {
      console.log('✅ Вход успешен, роль:', result.user.role)
      // Редирект произойдет автоматически в useEffect
    } else {
      console.log('❌ Ошибка входа:', result.error)
      setLoginError(result.error)
    }

    setLoading(false)
  }

  // Пока загружается AuthContext
  if (authLoading) {
    return (
      <div className={styles.loginPage}>
        <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>
          Загрузка...
        </div>
      </div>
    )
  }

  // Если пользователь уже авторизован - не показываем форму
  if (user) {
    return null
  }

  // Показываем ошибку из AuthContext или локальную ошибку
  const displayError = loginError || authError

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

          {displayError && (
            <div
              style={{
                color: '#ff6b6b',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              {displayError}
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