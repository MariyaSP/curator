import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '../components/auth/Login'
import ProtectedRoute from '../components/common/ProtectedRoute'
import AdminLayout from '../layouts/AdminLayout'
import CuratorLayout from '../layouts/CuratorLayout'
import AdminCalendar from '../pages/admin/AdminCalendar'
import AdminReferences from '../pages/admin/AdminReferences'
import AdminStatistics from '../pages/admin/AdminStatistics'
import AdminUsers from '../pages/admin/AdminUsers'
import CuratorStudents from '../pages/curator/CuratorStudents'
import StudentDetail from '../pages/curator/StudentDetail'
import CuratorCalendar from '../pages/curator/CuratorCalendar'
import CuratorReports from '../pages/curator/CuratorReports'
import StudentDashboard from '../pages/student/StudentDashboard'
import StudentPage from '../pages/student/StudentPage'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[1]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/calendar" replace />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="references" element={<AdminReferences />} />
          <Route path="statistics" element={<AdminStatistics />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        <Route
          path="/curator"
          element={
            <ProtectedRoute allowedRoles={[2]}>
              <CuratorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CuratorStudents />} />
          <Route path="students" element={<CuratorStudents />} />
          <Route path="students/:id" element={<StudentPage />} />
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