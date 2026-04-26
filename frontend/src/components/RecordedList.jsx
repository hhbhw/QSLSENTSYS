import { useState } from 'react'

function formatExtraText(extraAttributes) {
  return Object.entries(extraAttributes || {}).map(([k, v]) => `${k}:${v}`).join('\n')
}

function parseExtraText(text) {
  const result = {}
  text.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const idx = line.indexOf(':')
    if (idx <= 0) return
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key) result[key] = value
  })
  return result
}

export default function RecordedList({ records, loading, onRefresh, onUpdate, onDelete, canEdit }) {
  const [editingId, setEditingId] = useState(null)
  const [formState, setFormState] = useState({ card_type: '', is_written: false, is_sent: false, extra_text: '' })
  const [collapsed, setCollapsed] = useState(true)

  const startEdit = (item) => {
    setEditingId(item.id)
    setFormState({
      card_type: item.card_type || '',
      is_written: !!item.is_written,
      is_sent: !!item.is_sent,
      extra_text: formatExtraText(item.extra_attributes),
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormState({ card_type: '', is_written: false, is_sent: false, extra_text: '' })
  }

  const saveEdit = async (id) => {
    await onUpdate(id, {
      card_type: formState.card_type,
      is_written: formState.is_written,
      is_sent: formState.is_sent,
      extra_attributes: parseExtraText(formState.extra_text),
    })
    cancelEdit()
  }

  return (
    <div className="card">
      <div className="topbar">
        <h3>已录入数据总览</h3>
        <div className="inline-actions">
          <button type="button" className="secondary-btn collapse-toggle" onClick={() => setCollapsed((prev) => !prev)}>{collapsed ? '▸ 展开' : '▾ 收起'}</button>
          <button type="button" onClick={onRefresh}>刷新总览</button>
        </div>
      </div>
      {!collapsed && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>呼号</th>
                <th>卡片类型</th>
                <th>已写好</th>
                <th>已发出</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>正在加载...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6}>暂无数据</td>
                </tr>
              ) : (
                records.map((item) => (
                  <tr key={`overview-${item.id}`}>
                    <td>{item.callsign}</td>
                    <td>
                      {editingId === item.id ? (
                        <input value={formState.card_type} onChange={(e) => setFormState({ ...formState, card_type: e.target.value })} />
                      ) : item.card_type}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <label className="inline-check"><input type="checkbox" checked={formState.is_written} onChange={(e) => setFormState({ ...formState, is_written: e.target.checked })} />是</label>
                      ) : (item.is_written ? '是' : '否')}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <label className="inline-check"><input type="checkbox" checked={formState.is_sent} onChange={(e) => setFormState({ ...formState, is_sent: e.target.checked })} />是</label>
                      ) : (item.is_sent ? '是' : '否')}
                    </td>
                    <td>{item.created_at || '-'}</td>
                    <td>
                      {canEdit && editingId === item.id ? (
                        <div className="edit-actions">
                          <textarea rows="3" value={formState.extra_text} onChange={(e) => setFormState({ ...formState, extra_text: e.target.value })} placeholder={'key:value\nmode:SSB'} />
                          <div className="inline-actions">
                            <button type="button" onClick={() => saveEdit(item.id)}>保存</button>
                            <button type="button" onClick={cancelEdit}>取消</button>
                          </div>
                        </div>
                      ) : canEdit ? (
                        <div className="inline-actions">
                          <button type="button" onClick={() => startEdit(item)}>编辑</button>
                          <button type="button" className="danger-btn" onClick={() => onDelete(item.id)}>删除</button>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
