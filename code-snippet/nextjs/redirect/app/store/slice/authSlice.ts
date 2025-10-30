// app/store/slice/authSlice.ts
import { StateCreator } from 'zustand';
import type { User } from 'firebase/auth';
import {
  auth, watchAuth, startGoogleRedirectLogin, tryGetRedirectResultOnce
} from '@/app/lib/firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  redirectInfo?: { blocked?: boolean; note?: string }; // 안내용

  initAuth: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  _authInited?: boolean;
  _unsubAuth?: () => void;
}

export const createAuthSlice: StateCreator<AuthState, [], [], AuthState> = (set, get) => ({
  user: null,
  loading: false,
  error: null,
  redirectInfo: undefined,

  async initAuth() {
    if (get()._authInited) return;
    set({ loading: true, error: null });

    const unsub = watchAuth((user) => {
      set({ user: user ?? null, loading: false });
    });
    set({ _unsubAuth: unsub, _authInited: true });

    // 앱 구동 시 리다이렉트 결과 복구 1회
    const { cred, hadRedirectIntent, storageOk } = await tryGetRedirectResultOnce();

    // 세션 복구가 막혔을 가능성 안내(의도는 있었는데 cred가 null이고 storage도 불가)
    if (hadRedirectIntent && !cred && !storageOk) {
      set({
        redirectInfo: {
          blocked: true,
          note: '리다이렉트 세션 복구가 브라우저 설정(세션 저장소/타사쿠키)으로 차단된 것 같아요.',
        },
      });
    }
  },

  async loginWithGoogle() {
    set({ loading: true, error: null, redirectInfo: undefined });
    try {
      await startGoogleRedirectLogin(); // 무조건 리다이렉트
      // 이후 흐름은 tryGetRedirectResultOnce + onAuthStateChanged가 처리
    } catch (e: any) {
      set({ error: e?.message ?? '로그인 실패', loading: false });
    }
  },

  async logout() {
    set({ loading: true, error: null });
    try {
      await (await import('firebase/auth')).signOut(auth);
    } finally {
      set({ loading: false });
    }
  },
});
