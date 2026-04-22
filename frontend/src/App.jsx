import { useEffect, useState } from 'react'
import { changePassword, createRecord, deleteRecord, getCurrentUser, login, searchRecords, updateRecord } from './api/client'
import ChangePasswordModal from './components/ChangePasswordModal'
import LoginForm from './components/LoginForm'
import RecordForm from './components/RecordForm'
import RecordedList from './components/RecordedList'
import RecordTable from './components/RecordTable'
import PublicQueryPage from './pages/PublicQueryPage'
import UserManagementPanel from './components/UserManagementPanel'

export default function App() {
  const isPublicPage = window.location.pathname.startsWith('/public-query')
  const [token, setToken] = useState(localStorage.getItem('qsl_token') || '')
  const [role, setRole] = useState(localStorage.getItem('qsl_role') || '')
  const [username, setUsername] = useState(localStorage.getItem('qsl_username') || '')
  const [needChangePassword, setNeedChangePassword] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [records, setRecords] = useState([])
  const [overviewRecords, setOverviewRecords] = useState([])
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [searchExtraQuery, setSearchExtraQuery] = useState('')
  const [filterWritten, setFilterWritten] = useState('')
  const [filterSent, setFilterSent] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [highlightedRecordId, setHighlightedRecordId] = useState(null)
  const [message, setMessage] = useState('')

  const canEdit = role === 'admin' || role === 'editor'
  const isAdmin = role === 'admin'

  if (isPublicPage) {
    return <PublicQueryPage />
  }

  const loadRecords = async (callsign = '', page = 1, written = '', sent = '', sort = 'created_at', order = 'desc', extraQuery = '') => {
    const result = await searchRecords(callsign, written === '' ? undefined : written === 'true', sent === '' ? undefined : sent === 'true', sort, order, page, 20, extraQuery)
    setRecords(result.data || [])
    setPagination(result.pagination || {})
  }

  const loadOverviewRecords = async () => {
    setOverviewLoading(true)
    try {
      const result = await searchRecords('', undefined, undefined, 'created_at', 'desc', 1, 100)
      setOverviewRecords(result.data || [])
    } finally {
      setOverviewLoading(false)
    }
  }

  useEffect(() => {
    if (token && !needChangePassword) {
      if (!role) {
        getCurrentUser().then((user) => {
          setRole(user.role)
          setUsername(user.username)
          localStorage.setItem('qsl_role', user.role)
          localStorage.setItem('qsl_username', user.username)
        }).catch(() => {
          setMessage('无法获取用户角色，请重新登录')
        })
      }
      loadRecords(searchTerm, 1, filterWritten, filterSent, sortBy, sortOrder).catch((e) => {
        setMessage(e.message)
      })
      loadOverviewRecords().catch((e) => {
        setMessage(e.message)
      })
    }
  }, [token, needChangePassword])

  const handleLogin = async (username, password) => {
    const data = await login(username, password)
    localStorage.setItem('qsl_token', data.access_token)
    localStorage.setItem('qsl_role', data.role)
    localStorage.setItem('qsl_username', data.username)
    setToken(data.access_token)
    setRole(data.role)
    setUsername(data.username)
    if (!data.password_changed) {
      setNeedChangePassword(true)
    }
    setMessage('登录成功')
  }

  const handleChangePassword = async (oldPassword, newPassword) => {
    await changePassword(oldPassword, newPassword)
    setNeedChangePassword(false)
    setShowChangePasswordModal(false)
    setMessage('密码修改成功！')
  }

  const handleCreate = async (payload) => {
    if (!canEdit) {
      setMessage('当前账号仅有查看权限')
      return
    }
    const created = await createRecord(payload)
    setMessage(`记录创建成功：${created.callsign}`)
    setSearchTerm(created.callsign)
    setFilterWritten('')
    setFilterSent('')
    await loadRecords(created.callsign, 1, '', '', sortBy, sortOrder, '')
    await loadOverviewRecords()
    setHighlightedRecordId(created.id)
  }

  useEffect(() => {
    if (!highlightedRecordId) return
    const timer = setTimeout(() => {
      setHighlightedRecordId(null)
    }, 4500)
    return () => clearTimeout(timer)
  }, [highlightedRecordId])

  const handleSearch = async (event) => {
    event.preventDefault()
    setPagination({ ...pagination, page: 1 })
    await loadRecords(searchTerm, 1, filterWritten, filterSent, sortBy, sortOrder, searchExtraQuery)
  }

  const handleUpdate = async (id, payload) => {
    if (!canEdit) {
      setMessage('当前账号仅有查看权限')
      return
    }
    await updateRecord(id, payload)
    setMessage('记录已更新')
    await loadRecords(searchTerm, pagination.page, filterWritten, filterSent, sortBy, sortOrder, searchExtraQuery)
    await loadOverviewRecords()
  }

  const handleDelete = async (id) => {
    if (!canEdit) {
      setMessage('当前账号仅有查看权限')
      return
    }
    if (!window.confirm('确定删除这条记录吗？')) return
    await deleteRecord(id)
    setMessage('记录已删除')
    await loadRecords(searchTerm, pagination.page, filterWritten, filterSent, sortBy, sortOrder, searchExtraQuery)
    await loadOverviewRecords()
  }

  const handlePageChange = async (newPage) => {
    await loadRecords(searchTerm, newPage, filterWritten, filterSent, sortBy, sortOrder, searchExtraQuery)
  }

  const handleSortChange = async (newSort, newOrder) => {
    setSortBy(newSort)
    setSortOrder(newOrder)
    setPagination({ ...pagination, page: 1 })
    await loadRecords(searchTerm, 1, filterWritten, filterSent, newSort, newOrder, searchExtraQuery)
  }

  const handleLogout = () => {
    localStorage.removeItem('qsl_token')
    localStorage.removeItem('qsl_role')
    localStorage.removeItem('qsl_username')
    setToken('')
    setRole('')
    setUsername('')
    setRecords([])
    setMessage('已退出登录')
  }

  if (!token) {
    return (
      <main className="container auth-page">
        <h1>QSL 卡片发出记录系统</h1>
        <LoginForm onLogin={handleLogin} />
      </main>
    )
  }

  if (needChangePassword) {
    return (
      <main className="container">
        <ChangePasswordModal onClose={() => setNeedChangePassword(false)} onSubmit={handleChangePassword} />
      </main>
    )
  }

  return (
    <main className="container">
      <header className="topbar">
        <h1>QSL 卡片发出记录系统</h1>
        <div className="topbar-actions">
          <span className="role-badge">{username} / {role || 'unknown'}</span>
          <button type="button" onClick={() => setShowChangePasswordModal(true)}>修改密码</button>
          <button type="button" onClick={handleLogout}>退出</button>
        </div>
      </header>

      {(needChangePassword || showChangePasswordModal) && (
        <ChangePasswordModal
          onClose={() => {
            if (!needChangePassword) setShowChangePasswordModal(false)
          }}
          onSubmit={handleChangePassword}
        />
      )}

      {canEdit && <RecordForm onCreate={handleCreate} />}

      {isAdmin && <UserManagementPanel />}

      {message && <p className="message">{message}</p>}
      <RecordedList records={overviewRecords} loading={overviewLoading} onRefresh={loadOverviewRecords} onUpdate={handleUpdate} onDelete={handleDelete} canEdit={canEdit} />

      <form className="card search-bar" onSubmit={handleSearch}>
        <label>
          呼号
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="输入呼号" />
        </label>
        <label>
          扩展属性
          <input value={searchExtraQuery} onChange={(e) => setSearchExtraQuery(e.target.value)} placeholder="例如 SEND / mode / SSB" />
        </label>
        <label>
          已写好
          <select value={filterWritten} onChange={(e) => setFilterWritten(e.target.value)}>
            <option value="">全部</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </label>
        <label>
          已发出
          <select value={filterSent} onChange={(e) => setFilterSent(e.target.value)}>
            <option value="">全部</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </label>
        <button type="submit">查询</button>
        <button type="button" onClick={() => loadRecords(searchTerm, 1, filterWritten, filterSent, sortBy, sortOrder, searchExtraQuery)}>刷新列表</button>
        <button type="button" onClick={() => { setSearchTerm(''); setSearchExtraQuery(''); setFilterWritten(''); setFilterSent(''); loadRecords('', 1, '', '', sortBy, sortOrder, '') }}>重置</button>
      </form>
      <RecordTable
        records={records}
        pagination={pagination}
        sortBy={sortBy}
        sortOrder={sortOrder}
        highlightedRecordId={highlightedRecordId}
        canEdit={canEdit}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
      />
    </main>
  )
}
