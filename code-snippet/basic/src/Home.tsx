// src/Home.tsx
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './index.css'
import TabBar from './componets/TabBar'

export default function Home() {
  // 모바일 드로어 열림 상태
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 데스크톱 레일 접힘 상태
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 접힘 상태 영속화
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) setSidebarCollapsed(saved === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} has-tabbar`}>
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
          <NavLink to="/chat">Chat</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>

      {/* 사이드바 (모바일: overlay 드로어, 데스크톱: 고정 + 접힘/펼침) */}
      <aside className="app-sidebar" onClick={() => setSidebarOpen(false)}>
        <div
          className="sidebar-inner"
          onClick={(e) => e.stopPropagation()}
          data-collapsed={sidebarCollapsed ? '1' : '0'}
        >
          <div className="sidebar-header">
            <span className="sidebar-title">메뉴</span>
            {/* 데스크톱에서만 보이도록 CSS로 제어 */}
            <button
              className="collapse-btn"
              aria-label={sidebarCollapsed ? 'expand sidebar' : 'collapse sidebar'}
              onClick={() => setSidebarCollapsed(v => !v)}
            >
              {sidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/" end>
              <span className="icon">🏠</span><span className="label">홈</span>
            </NavLink>
            <NavLink to="/todos">
              <span className="icon">✅</span><span className="label">할일</span>
            </NavLink>
            <NavLink to="/chat">
              <span className="icon">💬</span><span className="label">채팅</span>
            </NavLink>
            <NavLink to="/settings">
              <span className="icon">⚙️</span><span className="label">설정</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">{!sidebarCollapsed ? 'v0.1' : ''}</div>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
        <footer className="app-footer">
          © {new Date().getFullYear()} AppWeb
        </footer>
      </main>

      {/* 모바일 하단 탭바 */}
      <TabBar />

      {/* 오버레이 */}
      <div
        className="overlay"
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />
    </div>
  )
}
