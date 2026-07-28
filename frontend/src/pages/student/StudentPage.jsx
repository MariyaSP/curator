import React from 'react'
import { useParams } from 'react-router-dom'
import StudentDetail from '../../components/student/StudentDetail'

const StudentPage = () => {
  const { id } = useParams()
  return <StudentDetail studentId={parseInt(id)} />
}

export default StudentPage