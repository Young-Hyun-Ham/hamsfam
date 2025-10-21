// src/login/types.ts

type AvatarColor = { from: string; to: string }
interface LoginPreset {
  id: string;
  avatarColors: AvatarColor[];
  message: string;
  avatarCount: number;
}

type User = { id: string; email: string; name: string | null }
interface AuthState {
  user: User | null
  token: string | null
  ready: boolean               // 초기 부팅 체크 완료 여부
  setAuth: (user: User | null, token: string | null) => void
  clear: () => void
  setReady: (v: boolean) => void
}

export type {
  LoginPreset,
  AuthState,
}