import React from 'react'

const AdminDashboard = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4f6f9',
        padding: '40px',
        color: '#1a2a4a',
      }}
    >
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Панель администратора</h1>
      <p style={{ fontSize: '18px', opacity: 0.8 }}>
        Добро пожаловать в систему управления колледжем.
      </p>
    </div>
  )
}

export default AdminDashboard