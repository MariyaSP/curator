import React from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import AppRouter from './router/AppRouter'
import './App.css'

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app-container">
          <AppRouter />
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App