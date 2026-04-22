import { useEffect, useMemo, useState } from 'react'

export default function RecordTable({ records, pagination, sortBy, sortOrder, highlightedRecordId, onUpdate, onPageChange, onSortChange }) {
  const [editingId, setEditingId] = useState(null)
  const [editingExtra, setEditingExtra] = useState('')

  useEffect(() => {
    if (!highlightedRecordId) return
    const target = document.querySelector(`tr[data-row-id="${highlightedRecordId}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedRecordId, records])

  const extraKeys = useMemo(() => {
    const keys = new Set()
    records.forEach((item) => {
      Object.keys(item.extra_attributes || {}).forEach((key) => keys.add(key))
    })
    return Array.from(keys)
  }, [records])

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditingExtra(
      Object.entries(item.extra_attributes || {})
        .map(([k, v]) => `${k}:${v}`)
        .join('\n'),
    )
  }

  const parseExtra = (text) => {
    const obj = {}
    text.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
      const i = line.indexOf(':')
      if (i > 0) obj[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    })
    return obj
  }

  const toggleSort = (col) => {
    if (sortBy === col) {
      onSortChange(col, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSortChange(col, 'desc')
    }
  }

  const renderSortIndicator = (col) => {
    if (sortBy !== col) return ' ↕'
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="card">
      <h3>查询结果</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th><button className="sort-btn" onClick={() => toggleSort('callsign')}>呼号{renderSortIndicator('callsign')}</button></th>
              <th>卡片类型</th>
              <th><button className="sort-btn" onClick={() => toggleSort('created_at')}>已写好{renderSortIndicator('created_at')}</button></th>
              <th>已发出</th>
              {extraKeys.map((key) => <th key={key}>{key}</th>)}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={5 + extraKeys.length}>没有匹配的数据，请调整查询条件后重试。</td>
              </tr>
            ) : records.map((item) => (
              <tr key={item.id} data-row-id={item.id} className={highlightedRecordId === item.id ? 'row-highlight' : ''}>
                <td>{item.callsign}</td>
                <td>{item.card_type}</td>
                <td>{item.is_written ? '是' : '否'}</td>
                <td>{item.is_sent ? '是' : '否'}</td>
                {extraKeys.map((key) => <td key={key}>{item.extra_attributes?.[key] || '-'}</td>)}
                <td>
                  {editingId === item.id ? (
                    <div className="edit-actions">
                      <textarea rows="3" value={editingExtra} onChange={(e) => setEditingExtra(e.target.value)} />
                      <button onClick={() => onUpdate(item.id, { extra_attributes: parseExtra(editingExtra) }).then(() => setEditingId(null))}>保存扩展属性</button>
                    </div>
                  ) : (
                    <div className="edit-actions">
                      <button onClick={() => onUpdate(item.id, { is_written: !item.is_written })}>切换已写好</button>
                      <button onClick={() => onUpdate(item.id, { is_sent: !item.is_sent })}>切换已发出</button>
                      <button onClick={() => startEdit(item)}>编辑扩展属性</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1}>上一页</button>
        <span>第 {pagination.page}/{pagination.total_pages} 页（共 {pagination.total} 条）</span>
        <button onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.total_pages}>下一页</button>
      </div>
    </div>
  )
}
