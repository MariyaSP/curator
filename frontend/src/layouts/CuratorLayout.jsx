import React, { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './CuratorLayout.css'

const CuratorLayout = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [active, setActive] = useState('students')

  const handleLogout = () => {
    logout()                              // 1. Очищает состояние через AuthContext
    navigate('/login', { replace: true }) // 2. Редиректит на страницу входа
  }

  return (
    <div className="curator-layout">
      {/* Боковое меню */}
      <aside className="curator-sidebar">
        <div className="sidebar-title">Куратор</div>
        <nav className="sidebar-nav">
          <Link
            to="/curator"
            className={active === 'students' ? 'active' : ''}
            onClick={() => setActive('students')}
          >
            <span className="nav-icon">👥</span> Студенты
          </Link>
          <Link
            to="/curator/calendar"
            className={active === 'calendar' ? 'active' : ''}
            onClick={() => setActive('calendar')}
          >
            <span className="nav-icon">📅</span> Календарь
          </Link>
          <Link
            to="/curator/reports"
            className={active === 'reports' ? 'active' : ''}
            onClick={() => setActive('reports')}
          >
            <span className="nav-icon">📊</span> Отчёты
          </Link>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span> Выйти
        </button>
      </aside>

      {/* Основной контент */}
      <main className="curator-content">
        <header className="curator-header">
          <div className="header-left">
            <h2>Панель куратора</h2>
          </div>
          <div className="header-right">
            <span className="user-info">
              {user?.full_name || 'Куратор'}
            </span>
          </div>
        </header>
        <div className="curator-body">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default CuratorLayout