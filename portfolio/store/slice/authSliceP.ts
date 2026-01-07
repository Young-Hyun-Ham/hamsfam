// store/slice/authSliceP.ts
import { postgresLoginApi, loginWithTestIdApi, logoutApi } from '@/lib/api/auth';
import { api } from '@/lib/axios';
import { User } from '@/types/user';

type AuthState = {
  token: string | null;
  setAuth: (user: User, token: string) => void;
  // Google OAuth 시작 (A안 – 팝업/리다이렉트용)
  loginWithGoogle: () => Promise<void>;
  // 일반 아이디/비밀번호 로그인
  loginWithEmail: (email: string, password: string) => Promise<void>;
  // 테스트 로그인
  loginWithTestId: (userId: string) => Promise<void>;
  // 로그아웃
  logout: () => Promise<void>;
};

export const createAuthSlice = (set: any, get: any): AuthState => ({
  token: null,

  setAuth(user, token) {
    // 원하면 여기서 localStorage도 같이 업데이트
    set({ user, token });
  },

  // 백엔드의 /api/auth/google/start 로 리다이렉트(또는 팝업)한다고 가정
  loginWithGoogle: async () => {
    try {
      // 팝업 방식: window.open 사용 (원하면 리다이렉트 방식으로 바꿔도 됨)
      const popup = window.open(
        '/api/oauth/google?flow=popup&redirect=/main',
        'googleLogin',
        'width=500,height=650'
      );

      if (!popup) {
        console.error('Popup blocked');
        return;
      }

      // popup 에서 인증 완료 후 window.opener.postMessage(...) 로 토큰 전달한다고 가정
      const handleMessage = async (event: MessageEvent) => {
        if (!event.data || event.data.type !== 'google-auth') return;

        const { accessToken, user, refreshToken } = event.data;

        if (typeof window !== 'undefined') {
          // localStorage.setItem('access_token', accessToken);
          // localStorage.setItem('refresh_token', refresh_token);
        }

        set({ user, token: accessToken, authChecked: true });

        await get().setUserAndLoadData(user);

        window.removeEventListener('message', handleMessage);
        popup.close();
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('loginWithGoogle failed:', error);
      throw error;
    }
  },
  
  // 이메일/비밀번호 로그인
  loginWithEmail: async (email: string, password: string) => {
    try {
      const { user, accessToken }  = await postgresLoginApi(email, password);
      // 일단 현재 세션에만 바로 세팅
      set({ user, token: accessToken, authChecked: true });
      await get().setUserAndLoadData(user);
    } catch (error) {
      console.error('Login with email failed:', error);
      throw error;
    }
  },

  // test ID 로그인 (현재 Firebase 대신 Postgres API 호출)
  loginWithTestId: async (userId: string) => {
    if (!userId || !userId.trim()) {
      console.error("Test User ID cannot be empty.");
      return;
    }

    try {
      const { user, accessToken } = await loginWithTestIdApi(userId.trim());

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', accessToken);
      }

      set({ user, token: accessToken, authChecked: true });

      await get().setUserAndLoadData({
        ...user,
        isTestUser: true, // 이전 로직 유지
      });
    } catch (error) {
      console.error('Login with test id failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // 서버 로그아웃 호출 + 스토어에서 데이터 제거 등
      await api.get("/api/auth/logout").catch(() => {
        // 서버 로그아웃 실패해도 프론트 쪽은 정리
      });
      set({ user: null, token: null });

      get().clearUserAndData();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },
});
