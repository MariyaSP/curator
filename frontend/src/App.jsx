import React from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import AppRouter from './router/AppRouter'

const AppContent = () => {
  const { theme } = useTheme()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: `linear-gradient(145deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 45%, ${theme.colors.accent} 100%)`,
        padding: '20px',
        fontFamily: theme.fonts.family,
        margin: 0,
      }}
    >
      <AppRouter />
    </div>
  )
}

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App