// src/auth/RequireAuth.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth() {
  const { user, ready } = useAuth()
  const loc = useLocation()

  if (!ready) {
    // 초기 부팅 체크 중일 때는 아무것도 렌더하지 않거나 스켈레톤 표시
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  return <Outlet />
}
