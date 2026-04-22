import { useEffect, useState } from 'react'
import { searchPublicRecords } from '../api/client'

export default function PublicQueryPage() {
  const [callsign, setCallsign] = useState('')
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('请输入呼号查询卡片状态')

  const loadPublicRecords = async (value = callsign, page = 1) => {
    const query = value.trim().toUpperCase()
    if (!query) {
      setRecords([])
      setPagination({ page: 1, page_size: 20, total: 0, total_pages: 0 })
      setMessage('请输入呼号查询卡片状态')
      return
    }

    setLoading(true)
    try {
      const result = await searchPublicRecords(query, page, 20)
      setRecords(result.data || [])
      setPagination(result.pagination || { page, page_size: 20, total: 0, total_pages: 0 })
      setMessage(result.data?.length ? `找到 ${result.data.length} 条记录` : '没有找到匹配的呼号')
    } catch (error) {
      setMessage(error.message)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialCallsign = params.get('callsign') || ''
    if (initialCallsign) {
      setCallsign(initialCallsign)
      loadPublicRecords(initialCallsign, 1)
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    await loadPublicRecords(callsign, 1)
  }

  const handlePageChange = async (nextPage) => {
    await loadPublicRecords(callsign, nextPage)
  }

  return (
    <main className="container public-page">
      <section className="public-hero card">
        <h1>QSL 卡片状态查询</h1>
        <p>输入呼号即可查看是否已写好、是否已发出。</p>
      </section>

      <form className="card public-search" onSubmit={handleSubmit}>
        <label>
          呼号
          <input value={callsign} onChange={(e) => setCallsign(e.target.value)} placeholder="例如 BG1ABC" />
        </label>
        <div className="public-search-actions">
          <button type="submit" disabled={loading}>{loading ? '查询中...' : '查询'}</button>
          <button type="button" className="secondary-btn" onClick={() => { setCallsign(''); setRecords([]); setPagination({ page: 1, page_size: 20, total: 0, total_pages: 0 }); setMessage('请输入呼号查询卡片状态') }}>清空</button>
        </div>
      </form>

      {message && <p className="message public-message">{message}</p>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>呼号</th>
                <th>已写好</th>
                <th>已发出</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={3}>{loading ? '正在加载...' : '暂无结果'}</td>
                </tr>
              ) : records.map((item) => (
                <tr key={item.callsign}>
                  <td>{item.callsign}</td>
                  <td>{item.is_written ? '是' : '否'}</td>
                  <td>{item.is_sent ? '是' : '否'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button type="button" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>上一页</button>
          <span>第 {pagination.page}/{pagination.total_pages || 1} 页（共 {pagination.total} 条）</span>
          <button type="button" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.total_pages}>下一页</button>
        </div>
      </div>
    </main>
  )
}