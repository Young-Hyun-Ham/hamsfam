// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect } from 'react'
import { create } from 'zustand'

type User = { id: string; email: string; name: string | null }
type AuthState = {
  user: User | null
  token: string | null
  ready: boolean               // 초기 부팅 체크 완료 여부
  setAuth: (user: User | null, token: string | null) => void
  clear: () => void
  setReady: (v: boolean) => void
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  ready: false,                // 초기엔 준비 안됨
  setAuth: (user, token) => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
    set({ user, token })
  },
  clear: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
  setReady: (v) => set({ ready: v }),
}))

const AuthContext = createContext<AuthState | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAuthStore();

  // 앱 재실행 시 토큰으로 /me 확인
  useEffect(() => {
    const t = localStorage.getItem('access_token');
    if (!t) {
      store.clear();
      store.setReady(true);        // 토큰 없으면 바로 준비 완료 처리
      return;
    }
    fetch(`${import.meta.env.VITE_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${t}` },
      credentials: 'include',
    })
      .then(async (res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          store.setAuth(data.user, t);
        } else { 
          store.clear();
        }
      })
      .catch(() => {
        store.clear();
      })
      .finally(() => store.setReady(true))  // API 확인이 끝나면 준비 완료
  }, []);

  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
