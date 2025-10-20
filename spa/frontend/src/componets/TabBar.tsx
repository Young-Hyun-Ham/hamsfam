import { NavLink } from 'react-router-dom'

export default function TabBar(){
  return (
    <nav className="tabbar" aria-label="bottom navigation">
      <NavLink to="/" end>
        <div>🏠</div>
        <small>Home</small>
      </NavLink>
      <NavLink to="/todos">
        <div>✅</div>
        <small>Todos</small>
      </NavLink>
      <NavLink to="/chat">
        <div>💬</div>
        <small>Chat</small>
      </NavLink>
      <NavLink to="/settings">
        <div>⚙️</div>
        <small>Settings</small>
      </NavLink>
    </nav>
  )
}
