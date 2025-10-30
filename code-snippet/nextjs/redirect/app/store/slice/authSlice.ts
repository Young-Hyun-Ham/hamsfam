// app/store/slice/authSlice.ts
import { StateCreator } from 'zustand';
import type { User } from 'firebase/auth';
import {
  auth, googleProvider, watchAuth,
  tryGetRedirectResultOnce, smartGoogleLogin, isSessionStorageOk
} from '@/app/lib/firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  needPopupFallback?: boolean;

  initAuth: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // 내부
  _authInited?: boolean;
  _unsubAuth?: () => void;
}

export const createAuthSlice: StateCreator<AuthState, [], [], AuthState> = (set, get) => ({
  user: null,
  loading: false,
  error: null,
  needPopupFallback: false,

  async initAuth() {
    if (get()._authInited) return;
    set({ loading: true, error: null });

    // 1) onAuthStateChanged 구독
    const unsub = watchAuth((user) => {
      set({ user: user ?? null, loading: false });
    });
    set({ _unsubAuth: unsub, _authInited: true });

    // 2) 리다이렉트 결과 복구 시도(한 번만)
    //    세션 스토리지가 막혀 있으면 복구 불가 → 팝업 안내 플래그
    const storageOk = isSessionStorageOk();
    const cred = await tryGetRedirectResultOnce();
    if (!cred && !storageOk) {
      // 화면에 "리다이렉트 복구가 차단된 것 같아요 → 팝업으로 로그인" 메시지 노출용
      set({ needPopupFallback: true });
    }
  },

  async loginWithGoogle() {
    set({ loading: true, error: null, needPopupFallback: false });
    try {
      await smartGoogleLogin(); // 팝업 우선, 안되면 자동 리다이렉트
      // 리다이렉트가 발생하면 이후 흐름은 initAuth의 watchAuth가 처리
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
