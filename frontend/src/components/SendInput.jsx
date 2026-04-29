import { useEffect, useRef, useState } from 'react'
import { getSendSuggestions } from '../api/client'

export default function SendInput({ value, onChange, placeholder = '发送人', onKeyDown }) {
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const fetchSuggestions = async (prefix) => {
    if (!prefix.trim()) {
      setSuggestions([])
      setShowDrop(false)
      return
    }
    const results = await getSendSuggestions(prefix)
    const filtered = results.filter((s) => s.toLowerCase() !== prefix.toLowerCase())
    setSuggestions(filtered)
    setShowDrop(filtered.length > 0)
    setActiveIdx(-1)
  }

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(val), 150)
  }

  const handleKeyDown = (e) => {
    if (showDrop) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, -1))
        return
      }
      if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault()
        confirm(suggestions[activeIdx])
        return
      }
      if (e.key === 'Escape') {
        setShowDrop(false)
        return
      }
    }
    onKeyDown?.(e)
  }

  const confirm = (val) => {
    onChange(val)
    setSuggestions([])
    setShowDrop(false)
    setActiveIdx(-1)
    inputRef.current?.focus()
  }

  const handleBlur = () => {
    setTimeout(() => {
      setShowDrop(false)
      setActiveIdx(-1)
    }, 150)
  }

  return (
    <div className="send-input-wrap">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDrop && (
        <ul className="send-suggestions">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={i === activeIdx ? 'active' : ''}
              onMouseDown={() => confirm(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
