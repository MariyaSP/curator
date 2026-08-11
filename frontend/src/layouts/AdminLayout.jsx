// frontend/src/layouts/AdminLayout.jsx
import React, { useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AdminLayout.css'

const pageTitles = {
  '/admin/calendar': 'Календарь событий',
  '/admin/references': 'Справочники',
  '/admin/statistics': 'Статистика',
  '/admin/users': 'Пользователи',
}

const AdminLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [active, setActive] = useState('calendar')
  const currentTitle = pageTitles[location.pathname] || ''

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-title">Администратор</div>
        <nav className="sidebar-nav">
          <Link
            to="/admin/calendar"
            className={active === 'calendar' ? 'active' : ''}
            onClick={() => setActive('calendar')}
          >
            <span className="nav-icon">📅</span> Календарь событий
          </Link>
          <Link
            to="/admin/references"
            className={active === 'references' ? 'active' : ''}
            onClick={() => setActive('references')}
          >
            <span className="nav-icon">📚</span> Справочники
          </Link>
          <Link
            to="/admin/statistics"
            className={active === 'statistics' ? 'active' : ''}
            onClick={() => setActive('statistics')}
          >
            <span className="nav-icon">📊</span> Статистика
          </Link>
          <Link
            to="/admin/users"
            className={active === 'users' ? 'active' : ''}
            onClick={() => setActive('users')}
          >
            <span className="nav-icon">👤</span> Пользователи
          </Link>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span> Выйти
        </button>
      </aside>

      <main className="admin-content">
        <header className="admin-header">
          <div className="header-left">
            <h2>Панель администратора</h2>
          </div>
          {currentTitle && (
            <div className="header-center">
              <span className="page-title">{currentTitle}</span>
            </div>
          )}
          <div className="header-right">
            <span className="user-info">{user?.full_name || 'Администратор'}</span>
          </div>
        </header>
        <div className="admin-body">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout