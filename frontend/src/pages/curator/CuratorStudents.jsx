import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import StudentCard from '../../components/curator/StudentCard'
import './CuratorStudents.css'

const CuratorStudents = () => {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')  // ← было addressFilter
  const [sortOrder, setSortOrder] = useState('asc')
  const [groups, setGroups] = useState([])

  const getGenderDisplay = (code) => {
    if (!code) return '—'
    const map = { 'MALE': 'Мужской', 'FEMALE': 'Женский' }
    return map[code] || code
  }

  const getSocialStatusDisplay = (id) => {
    if (!id) return '—'
    const map = {
      1: 'Полная семья',
      2: 'Неполная семья',
      3: 'Сирота',
      4: 'Многодетная семья',
      5: 'Ребёнок участника СВО'
    }
    return map[id] || '—'
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, groupsRes] = await Promise.all([
          api.get('/students'),
          api.get('/groups'),
        ])

        const normalizedStudents = studentsRes.data.map((s) => ({
          id: s.id,
          full_name: s.full_name || '—',
          birth_date: s.birth_date || null,
          group_name: s.group_name || '—',
          social_status_id: s.social_status_id || null,
          social_status_display: getSocialStatusDisplay(s.social_status_id),
          gender_code: s.gender || null,
          gender_display: getGenderDisplay(s.gender),
          registration_region: s.registration_region || '—',  // ← было registration_city
          registration_city: s.registration_city || '—',
          phone: s.phone || '—',
          email: s.email || '—',
          photo: s.photo || null,
          personal_number: s.personal_number || '—',
        }))

        setStudents(normalizedStudents)
        setFilteredStudents(normalizedStudents)
        setGroups(groupsRes.data || [])
      } catch (err) {
        console.error('Ошибка загрузки:', err)
        setError('Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    let result = [...students]

    if (search.trim()) {
      result = result.filter((s) =>
        s.full_name.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (groupFilter) {
      result = result.filter((s) => s.group_name === groupFilter)
    }

    if (statusFilter) {
      result = result.filter((s) => s.social_status_id === parseInt(statusFilter))
    }

    if (genderFilter && genderFilter !== '—') {
      result = result.filter((s) => s.gender_code === genderFilter)
    }

    // ===== ФИЛЬТР ПО ОБЛАСТИ (было по городу) =====
    if (regionFilter) {
      result = result.filter((s) =>
        s.registration_region.toLowerCase().includes(regionFilter.toLowerCase())
      )
    }

    if (sortOrder === 'asc') {
      result.sort((a, b) => {
        if (!a.birth_date) return 1
        if (!b.birth_date) return -1
        return new Date(a.birth_date) - new Date(b.birth_date)
      })
    } else {
      result.sort((a, b) => {
        if (!a.birth_date) return 1
        if (!b.birth_date) return -1
        return new Date(b.birth_date) - new Date(a.birth_date)
      })
    }

    setFilteredStudents(result)
  }, [search, groupFilter, statusFilter, genderFilter, regionFilter, sortOrder, students])

  const handleCardClick = (studentId) => {
    navigate(`/curator/students/${studentId}`)
  }


  const uniqueGroups = [...new Set(students.map((s) => s.group_name).filter(Boolean))]
  const uniqueStatuses = [...new Set(students.map((s) => s.social_status_id).filter(Boolean))]
  const uniqueGenders = [...new Set(students.map((s) => s.gender_code).filter(Boolean))]

  if (loading) return <div className="loading">Загрузка...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="students-page">
      <h3>Мои студенты</h3>

      <div className="filters-bar">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Поиск по ФИО"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Все группы</option>
            {uniqueGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Все статусы</option>
            {uniqueStatuses.map((id) => (
              <option key={id} value={id}>{getSocialStatusDisplay(id)}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Все полы</option>
            {uniqueGenders.map((code) => (
              <option key={code} value={code}>{getGenderDisplay(code)}</option>
            ))}
          </select>
        </div>

        {/* ===== ФИЛЬТР ПО ОБЛАСТИ (было по городу) ===== */}
        <div className="filter-group">
          <input
            type="text"
            placeholder="📍 Область прописки"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <button
            className={`sort-btn ${sortOrder}`}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            📅 Дата рождения {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="students-grid">
        {filteredStudents.length === 0 ? (
          <div className="empty-state">Студенты не найдены</div>
        ) : (
          filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={handleCardClick}
            />
          ))
        )}
      </div>

      <div className="students-count">
        Всего: <strong>{filteredStudents.length}</strong> студентов
      </div>
    </div>
  )
}

export default CuratorStudents