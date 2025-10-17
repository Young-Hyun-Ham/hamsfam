import { NavLink, Outlet } from 'react-router-dom'
import './styles.css'

export default function App() {
  const linkStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    border: '1px solid #e5e5e5',
  }
  const activeStyle: React.CSSProperties = {
    ...linkStyle,
    fontWeight: 700,
    background: '#f3f3f3',
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <h1 style={{ marginRight: 'auto' }}>SPA 샘플</h1>
        <NavLink to="/" end style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Home
        </NavLink>
        <NavLink to="/todos" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Todos
        </NavLink>
        <NavLink to="/settings" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Settings
        </NavLink>
      </header>

      <div style={{ height: 16 }} />
      <Outlet /> {/* 여기에 각 페이지가 렌더링됨 */}
    </div>
  )
}
