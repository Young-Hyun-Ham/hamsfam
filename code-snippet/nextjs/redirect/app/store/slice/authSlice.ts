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

    // 1) 먼저 onAuthStateChanged 구독
    get()._unsubAuth?.();
    const unsub = watchAuth(async (user) => {
      // 유저가 붙었다면 그대로 종료
      if (user) {
        try {
          await ensureUserDoc(user);
          const settings = await getOrInitSettings(user);
          set({ user, settings, loading: false, error: null, needPopupFallback: false });
        } catch (e: any) {
          set({ user, settings: null, loading: false, error: e?.message ?? 'Failed to load settings', needPopupFallback: false });
        }
        return;
      }

      // 여기까지 왔다는 건 아직 user 없음
      set({ user: null, settings: null, loading: false, error: null });
    });
    set({ _unsubAuth: unsub });

    // 2) 리다이렉트 복귀 케이스일 때만 getRedirectResult() "지연" 호출
    const redirected = sessionStorage.getItem('auth:redirecting') === '1';
    if (redirected) {
      // 짧게 한 텀(예: 200~400ms) 기다린 뒤 여전히 user 없으면 호출
      setTimeout(async () => {
        if (get().user) {
          sessionStorage.removeItem('auth:redirecting');
          return;
        }
        try {
          const user = await handleRedirectCallbackOnce(); // 내부에서 getRedirectResult 호출
          if (user) {
            // onAuthStateChanged가 곧 들어오므로 여기선 굳이 set 안 해도 됨
          } else {
            // 여전히 없음 → 팝업 폴백 버튼 노출
            set({ needPopupFallback: true });
          }
        } finally {
          sessionStorage.removeItem('auth:redirecting');
        }
      }, 300);
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
