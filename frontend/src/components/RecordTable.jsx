import { useEffect, useMemo, useState } from 'react'
import SendInput from './SendInput'

export default function RecordTable({ records, pagination, sortBy, sortOrder, highlightedRecordId, canEdit, onUpdate, onPageChange, onSortChange }) {
  const [editingId, setEditingId] = useState(null)
  const [editingExtra, setEditingExtra] = useState('')
  const [editingSendId, setEditingSendId] = useState(null)
  const [editingSendValue, setEditingSendValue] = useState('')
  const [activeRowId, setActiveRowId] = useState(null)

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
    setActiveRowId(item.id)
    setEditingId(item.id)
    setEditingExtra(
      Object.entries(item.extra_attributes || {})
        .map(([k, v]) => `${k}:${v}`)
        .join('\n'),
    )
  }

  const startEditSend = (item) => {
    setActiveRowId(item.id)
    setEditingSendId(item.id)
    setEditingSendValue(item.send || '')
  }

  const markRow = (rowId) => {
    setActiveRowId(rowId)
  }

  const handleSaveExtra = async (id) => {
    markRow(id)
    await onUpdate(id, { extra_attributes: parseExtra(editingExtra) })
    setEditingId(null)
  }

  const handleSaveSend = async (id) => {
    markRow(id)
    await onUpdate(id, { send: editingSendValue })
    setEditingSendId(null)
  }

  const handleToggleWritten = async (item) => {
    markRow(item.id)
    await onUpdate(item.id, { is_written: !item.is_written })
  }

  const handleToggleSent = async (item) => {
    markRow(item.id)
    await onUpdate(item.id, { is_sent: !item.is_sent })
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
              <th>SEND</th>
              {extraKeys.map((key) => <th key={key}>{key}</th>)}
              <th className="actions-head">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6 + extraKeys.length}>没有匹配的数据，请调整查询条件后重试。</td>
              </tr>
            ) : records.map((item) => (
              <tr
                key={item.id}
                data-row-id={item.id}
                className={highlightedRecordId === item.id || activeRowId === item.id ? 'row-highlight' : ''}
                onClick={() => markRow(item.id)}
              >
                <td>{item.callsign}</td>
                <td>{item.card_type}</td>
                <td>{item.is_written ? '是' : '否'}</td>
                <td>{item.is_sent ? '是' : '否'}</td>
                <td className="send-cell">
                  {canEdit && editingSendId === item.id ? (
                    <div className="send-edit-inline">
                      <SendInput
                        value={editingSendValue}
                        onChange={setEditingSendValue}
                        placeholder="发送人"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSaveSend(item.id) }
                          if (e.key === 'Escape') { setEditingSendId(null) }
                        }}
                      />
                      <button type="button" className="send-save-btn" onClick={() => handleSaveSend(item.id)}>✓</button>
                    </div>
                  ) : (
                    <span
                      className={canEdit ? 'send-display clickable' : 'send-display'}
                      onClick={canEdit ? (e) => { e.stopPropagation(); startEditSend(item) } : undefined}
                      title={canEdit ? '点击编辑发送人' : undefined}
                    >
                      {item.send || <span className="send-empty">—</span>}
                    </span>
                  )}
                </td>
                {extraKeys.map((key) => <td key={key}>{item.extra_attributes?.[key] || '-'}</td>)}
                <td className="actions-cell">
                  {canEdit && editingId === item.id ? (
                    <div className="edit-actions">
                      <textarea rows="3" value={editingExtra} onChange={(e) => setEditingExtra(e.target.value)} />
                      <button type="button" onClick={() => handleSaveExtra(item.id)}>保存扩展属性</button>
                    </div>
                  ) : canEdit ? (
                    <div className="edit-actions">
                      <button type="button" onClick={() => handleToggleWritten(item)}>切换已写好</button>
                      <button type="button" onClick={() => handleToggleSent(item)}>切换已发出</button>
                      <button type="button" onClick={() => startEdit(item)}>编辑扩展属性</button>
                    </div>
                  ) : (
                    <span>-</span>
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
