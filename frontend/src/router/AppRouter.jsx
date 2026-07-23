import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '../components/auth/Login'
import ProtectedRoute from '../components/common/ProtectedRoute'
import AdminDashboard from '../pages/admin/AdminDashboard'
import CuratorLayout from '../layouts/CuratorLayout'
import CuratorStudents from '../pages/curator/CuratorStudents'
import CuratorCalendar from '../pages/curator/CuratorCalendar'
import CuratorReports from '../pages/curator/CuratorReports'
import StudentDashboard from '../pages/student/StudentDashboard'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[1]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/curator"
          element={
            <ProtectedRoute allowedRoles={[2]}>
              <CuratorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CuratorStudents />} />
          <Route path="calendar" element={<CuratorCalendar />} />
          <Route path="reports" element={<CuratorReports />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={[3]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter