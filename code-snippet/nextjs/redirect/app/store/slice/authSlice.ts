import { StateCreator } from 'zustand';
import { signInWithPopup, User } from 'firebase/auth';
import {
  signOutAll,
  handleRedirectCallbackOnce,
  watchAuth,
  ensureUserDoc,
  getOrInitSettings,
  startGoogleRedirectLogin,
  testLogin,
  hardResetAuthArtifacts,
  auth, googleProvider,
} from '@/app/lib/firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  settings: Record<string, any> | null;
  needPopupFallback?: boolean;

  // 내부용
  _authInited?: boolean;
  _unsubAuth?: () => void;

  // actions
  initAuth: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithGooglePopup: () => Promise<void>;
  handleTestLogin: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthState, [], [], AuthState> = (set, get) => ({
  user: null,
  loading: false,
  error: null,
  settings: null,
  needPopupFallback: false,

  initAuth: () => {
    if (typeof window === 'undefined') return;
    if (get()._authInited) return;
    set({ _authInited: true, loading: true, error: null });

    get()._unsubAuth?.();
    const unsub = watchAuth(async (user) => {
      if (user) {
        try {
          await ensureUserDoc(user);
          const settings = await getOrInitSettings(user);
          set({ user, settings, loading: false, error: null, needPopupFallback: false });
        } catch (e:any) {
          set({ user, settings:null, loading:false, error:e?.message ?? 'Failed to load settings', needPopupFallback:false });
        }
        return;
      }
      set({ user:null, settings:null, loading:false, error:null });
    });
    set({ _unsubAuth: unsub });

    // 2) 리다이렉트 복귀였다면, 짧게 기다렸다가 여전히 user 없을 때만 한 번 호출
    const redirected = sessionStorage.getItem('auth:redirecting') === '1';
    if (redirected) {
      setTimeout(async () => {
        if (get().user) { sessionStorage.removeItem('auth:redirecting'); return; }
        const u = await handleRedirectCallbackOnce();
        if (!u && !get().user) set({ needPopupFallback: true });
        sessionStorage.removeItem('auth:redirecting');
      }, 500);
    }
  },

  loginWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      await startGoogleRedirectLogin(); // 현재창 리다이렉트
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'Google redirect failed' });
    }
  },

  loginWithGooglePopup: async () => {
    try {
      set({ loading: true, error: null });
      // 팝업은 반드시 사용자 클릭에서만 호출하도록, 이 액션은 버튼 핸들러에서만 사용
      await signInWithPopup(auth, googleProvider);
      set({ needPopupFallback: false, loading: false });
    } catch (e: any) {
      set({ loading: false, error: (e as any)?.message ?? 'Google popup failed' });
    }
  },

  handleTestLogin: async (displayName: string) => {
    try {
      set({ loading: true, error: null });
      await testLogin(displayName);
      set({ loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'Test login failed' });
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      // 1) 구독 해제
      get()._unsubAuth?.();
      set({ _unsubAuth: undefined });

      // 2) 파이어베이스 세션 종료
      await signOutAll();

      // 3) 리다이렉트/세션 아티팩트 완전 정리
      hardResetAuthArtifacts();

      // 4) 스토어 초기화
      set({
        user: null,
        settings: null,
        loading: false,
        error: null,
        _authInited: false,
      });

      // 5) (강력 권장) 깨끗한 상태로 재진입
      if (typeof window !== 'undefined') window.location.replace('/test-login');
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'Logout failed' });
    }
  },
});
