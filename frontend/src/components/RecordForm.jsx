import { useState } from 'react'

function parseExtraAttributes(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const result = {}
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key) result[key] = value
  }
  return result
}

export default function RecordForm({ onCreate }) {
  const [callsign, setCallsign] = useState('')
  const [cardType, setCardType] = useState('')
  const [isWritten, setIsWritten] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [extraText, setExtraText] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await onCreate({
        callsign,
        card_type: cardType,
        is_written: isWritten,
        is_sent: isSent,
        extra_attributes: parseExtraAttributes(extraText),
      })
      setCallsign('')
      setCardType('')
      setIsWritten(false)
      setIsSent(false)
      setExtraText('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>新增QSL记录</h3>
      <div className="grid two-col">
        <label>
          呼号
          <input value={callsign} onChange={(e) => setCallsign(e.target.value)} placeholder="例如 BG1ABC" required />
        </label>
        <label>
          卡片类型
          <input value={cardType} onChange={(e) => setCardType(e.target.value)} placeholder="例如 直邮卡" required />
        </label>
      </div>
      <div className="grid two-col check-row">
        <label><input type="checkbox" checked={isWritten} onChange={(e) => setIsWritten(e.target.checked)} />是否已写好</label>
        <label><input type="checkbox" checked={isSent} onChange={(e) => setIsSent(e.target.checked)} />是否已发出</label>
      </div>
      <label>
        扩展属性（每行一个，格式 key:value）
        <textarea rows="4" value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder={'frequency:14.270MHz\nmode:SSB'} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit">保存记录</button>
    </form>
  )
}
