import React, { useEffect, useState } from 'react'
import api from '../../api/client'
import './CuratorStudents.css'

const CuratorStudents = () => {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [addressFilter, setAddressFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [groups, setGroups] = useState([])

  // ===== ФУНКЦИИ ДЛЯ ПРЕОБРАЗОВАНИЯ КОДОВ В НАЗВАНИЯ =====
  const getGenderDisplay = (code) => {
    if (!code) return '—'
    const map = {
      'MALE': 'Мужской',
      'FEMALE': 'Женский'
    }
    return map[code] || code
  }

  // ===== ПРЕОБРАЗОВАНИЕ ID СОЦИАЛЬНОГО СТАТУСА В ТЕКСТ =====
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

        console.log('Данные студентов:', studentsRes.data)

        const normalizedStudents = studentsRes.data.map((s) => ({
          id: s.id,
          full_name: s.full_name || '—',
          birth_date: s.birth_date || null,
          group_name: s.group_name || '—',
          social_status_id: s.social_status_id || null,
          social_status_display: getSocialStatusDisplay(s.social_status_id),
          gender_code: s.gender || null,
          gender_display: getGenderDisplay(s.gender),
          registration_city: s.registration_city || '—',
          phone: s.phone || '—',
          email: s.email || '—',
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

    if (addressFilter) {
      result = result.filter((s) =>
        s.registration_city.toLowerCase().includes(addressFilter.toLowerCase())
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
  }, [search, groupFilter, statusFilter, genderFilter, addressFilter, sortOrder, students])

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

        <div className="filter-group">
          <input
            type="text"
            placeholder="🏙️ Город прописки"
            value={addressFilter}
            onChange={(e) => setAddressFilter(e.target.value)}
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

      <div className="students-table-wrapper">
        <table className="students-table">
          <thead>
            <tr>
              <th>№</th>
              <th>ФИО</th>
              <th>Дата рождения</th>
              <th>Группа</th>
              <th>Статус</th>
              <th>Пол</th>
              <th>Город</th>
              <th>Телефон</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">Студенты не найдены</td>
              </tr>
            ) : (
              filteredStudents.map((s, idx) => (
                <tr
                  key={s.id}
                  className="student-row"
                  onClick={() => console.log('Открыть карточку студента', s.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{idx + 1}</td>
                  <td><strong>{s.full_name}</strong></td>
                  <td>{s.birth_date ? new Date(s.birth_date).toLocaleDateString() : '—'}</td>
                  <td>{s.group_name}</td>
                  <td>{s.social_status_display}</td>
                  <td>{s.gender_display}</td>
                  <td>{s.registration_city}</td>
                  <td>{s.phone}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="students-count">
        Всего: <strong>{filteredStudents.length}</strong> студентов
      </div>
    </div>
  )
}

export default CuratorStudents