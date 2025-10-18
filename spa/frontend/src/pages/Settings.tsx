// src/pages/Settings.tsx
import { useState } from 'react'

export default function Settings() {
  const [apiBase, setApiBase] = useState(
    import.meta.env.VITE_API_BASE || 'http://localhost:8000'
  )
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  return (
    <div className="cardify">
      <h2 style={{ margin: 0 }}>Settings</h2>

      {/* 폼 래퍼: 모바일 100% / 데스크톱 max 560px */}
      <div className="form form-narrow mt-4" style={{ display: 'grid', gap: 12 }}>
        <label className="form-item">
          <div>API Base URL</div>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="http://localhost:8000"
          />
        </label>

        <label className="form-item">
          <div>Theme</div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <div className="mt-4">
          <button className="btn-block" onClick={() => alert(`(데모)\nAPI=${apiBase}\nTheme=${theme}`)}>
            저장 (데모)
          </button>
        </div>
      </div>
    </div>
  )
}
