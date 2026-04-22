const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

function getHeaders() {
  const token = localStorage.getItem('qsl_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw new Error('登录失败，请检查账号密码')
  return response.json()
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('获取用户信息失败')
  return response.json()
}

export async function changePassword(oldPassword, newPassword) {
  const response = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '修改密码失败')
  }
  return response.json()
}

export async function createRecord(payload) {
  const response = await fetch(`${API_BASE}/records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '创建记录失败')
  }
  return response.json()
}

export async function searchRecords(callsign, isWritten, isSent, sortBy = 'created_at', sortOrder = 'desc', page = 1, pageSize = 20, extraQuery = '') {
  const params = new URLSearchParams()
  if (callsign) params.append('callsign', callsign)
  if (extraQuery) params.append('extra_query', extraQuery)
  if (isWritten !== undefined) params.append('is_written', isWritten)
  if (isSent !== undefined) params.append('is_sent', isSent)
  params.append('sort_by', sortBy)
  params.append('sort_order', sortOrder)
  params.append('page', page)
  params.append('page_size', pageSize)
  
  const response = await fetch(`${API_BASE}/records?${params}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('查询失败')
  return response.json()
}

export async function searchPublicRecords(callsign, page = 1, pageSize = 20) {
  const params = new URLSearchParams()
  if (callsign) params.append('callsign', callsign)
  params.append('page', page)
  params.append('page_size', pageSize)

  const response = await fetch(`${API_BASE}/records/public?${params}`)
  if (!response.ok) throw new Error('公开查询失败')
  return response.json()
}

export async function updateRecord(id, payload) {
  const response = await fetch(`${API_BASE}/records/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '更新失败')
  }
  return response.json()
}

export async function deleteRecord(id) {
  const response = await fetch(`${API_BASE}/records/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '删除失败')
  }
}

export async function listUsers() {
  const response = await fetch(`${API_BASE}/users`, {
    headers: getHeaders(),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '获取账号列表失败')
  }
  return response.json()
}

export async function createUser(payload) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '创建账号失败')
  }
  return response.json()
}

export async function updateUser(id, payload) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '更新账号失败')
  }
  return response.json()
}

export async function resetUserPassword(id, newPassword) {
  const response = await fetch(`${API_BASE}/users/${id}/reset-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ new_password: newPassword }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || '重置密码失败')
  }
  return response.json()
}
