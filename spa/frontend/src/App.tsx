// src/App.tsx
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './styles.css'
import TabBar from './componets/Tabbar'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''} has-tabbar`}>
      <header className="app-header">
        <button
          className="burger"
          aria-label="open menu"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          ☰
        </button>
        <div className="brand">AppWeb</div>
        <nav className="top-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/todos">Todos</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>

      <aside className="app-sidebar" onClick={() => setSidebarOpen(false)}>
        <div className="sidebar-inner" onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">메뉴</div>
          <NavLink to="/" end>🏠 홈</NavLink>
          <NavLink to="/todos">✅ 할일</NavLink>
          <NavLink to="/settings">⚙️ 설정</NavLink>
          <div className="sidebar-footer">v0.1</div>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        © {new Date().getFullYear()} AppWeb
      </footer>

      {/* 모바일 하단 탭바 */}
      <TabBar />

      {/* 오버레이 */}
      <div 
        className="overlay" 
        onClick={() => setSidebarOpen(false)} aria-hidden={!sidebarOpen} />
    </div>
  )
}
