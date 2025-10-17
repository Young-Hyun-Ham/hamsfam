import { useState } from 'react'

export default function Settings() {
  const [apiBase, setApiBase] = useState(import.meta.env.VITE_API_BASE || 'http://localhost:8000')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  return (
    <div>
      <h2>Settings</h2>
      <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <label>
          <div>API Base URL</div>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="http://localhost:8000"
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <label>
          <div>Theme</div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <div>
          <button onClick={() => alert(`(데모)\nAPI=${apiBase}\nTheme=${theme}`)}>
            저장 (데모)
          </button>
        </div>
      </div>
    </div>
  )
}
