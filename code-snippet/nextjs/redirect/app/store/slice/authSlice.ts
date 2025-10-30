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

    handleRedirectCallbackOnce()
      .catch(() => {})
      .finally(() => {
        get()._unsubAuth?.();
        const unsub = watchAuth(async (user) => {
          if (user) {
            try {
              await ensureUserDoc(user);
              const settings = await getOrInitSettings(user);
              set({ user, settings, loading: false, error: null, needPopupFallback: false });
            } catch (e: any) {
              set({ user, settings: null, loading: false, error: e?.message ?? 'Failed to load settings', needPopupFallback: false });
            }
          } else {
            set({ user: null, settings: null, loading: false, error: null });
          }
        });
        set({ _unsubAuth: unsub });

        // 리다이렉트 복귀였는데 user가 안 붙었으면 UI에 “팝업으로 로그인” 버튼 노출
        const redirected = sessionStorage.getItem('auth:redirecting') === '1';
        if (typeof window !== 'undefined' && redirected) {
          // 짧게 한 텀 양보 후 still no user → 버튼 노출
          setTimeout(() => {
            if (!get().user) set({ needPopupFallback: true });
            // 여기서도 자동 팝업 호출은 금지 (팝업 차단됨)
            sessionStorage.removeItem('auth:redirecting');
          }, 300);
        }
      });
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
