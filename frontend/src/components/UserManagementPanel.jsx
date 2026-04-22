import { useEffect, useState } from 'react'
import { createUser, listUsers, resetUserPassword, updateUser } from '../api/client'

const ROLE_OPTIONS = [
  { value: 'viewer', label: '查看' },
  { value: 'editor', label: '编辑' },
  { value: 'admin', label: '管理员' },
]

export default function UserManagementPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer' })
  const [resetPasswords, setResetPasswords] = useState({})

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listUsers()
      setUsers(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers().catch(() => {})
  }, [])

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await createUser({
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
      })
      setNewUser({ username: '', password: '', role: 'viewer' })
      setMessage('账号创建成功')
      await loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRoleChange = async (userId, role) => {
    setError('')
    setMessage('')
    try {
      await updateUser(userId, { role })
      setMessage('角色已更新')
      await loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleActiveChange = async (userId, isActive) => {
    setError('')
    setMessage('')
    try {
      await updateUser(userId, { is_active: isActive })
      setMessage('状态已更新')
      await loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleResetPassword = async (userId) => {
    const newPassword = resetPasswords[userId] || ''
    if (newPassword.length < 8) {
      setError('新密码至少 8 位')
      return
    }

    setError('')
    setMessage('')
    try {
      await resetUserPassword(userId, newPassword)
      setResetPasswords((prev) => ({ ...prev, [userId]: '' }))
      setMessage('密码已重置')
      await loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <section className="card">
      <div className="topbar">
        <h3>账号管理（仅管理员）</h3>
        <button type="button" onClick={() => loadUsers()} disabled={loading}>刷新</button>
      </div>

      <form className="grid two-col" onSubmit={handleCreateUser}>
        <label>
          新用户名
          <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
        </label>
        <label>
          初始密码
          <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
        </label>
        <label>
          角色
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
            {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <div className="user-create-actions">
          <button type="submit">创建账号</button>
        </div>
      </form>

      {message && <p className="message">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>用户名</th>
              <th>角色</th>
              <th>启用</th>
              <th>重置密码</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4}>{loading ? '加载中...' : '暂无账号'}</td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>
                  <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                    {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </td>
                <td>
                  <label className="inline-check">
                    <input type="checkbox" checked={user.is_active} onChange={(e) => handleActiveChange(user.id, e.target.checked)} />
                    {user.is_active ? '启用' : '禁用'}
                  </label>
                </td>
                <td>
                  <div className="inline-actions">
                    <input
                      type="password"
                      placeholder="新密码(>=8位)"
                      value={resetPasswords[user.id] || ''}
                      onChange={(e) => setResetPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                    />
                    <button type="button" onClick={() => handleResetPassword(user.id)}>重置</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
