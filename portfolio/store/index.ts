// store/index.js
import { create } from "zustand";
import {
  db,
  auth,
  onAuthStateChanged,
  doc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  addDoc,
  setDoc,
} from "@/lib/firebase";
import { locales } from "@/lib/locales";
import { createAuthSlice as createFirebaseAuthSlice } from "@/store/slice/authSliceF";
import { createAuthSlice as createPostgresAuthSlice } from "@/store/slice/authSliceP";
import { postgresGetMeApi, firebaseGetMeApi } from '@/lib/api/auth';
import { createUISlice } from "@/store/slice/uiSlice";
import { NavItem, SidebarMenu } from "@/types/nav";
import { User } from "@/types/user";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? 'firebase';

const getInitialMessages = (lang: any = "ko") => {
  return [
    { id: "initial", sender: "bot", text: locales[lang].initialBotMessage },
  ];
};

export const useStore: any = create((set: any, get: any) => ({
  db,
  auth,
  user: null,
  authChecked: false,
  backend: BACKEND,
  loginType: 'google', // 'google' | 'email' | 'test'

  headerMenus: [],
  setHeaderMMenus: (data: NavItem) => { set({ headerMenus: data }) },
  sidebarMenus: [],
  setSidebarMenus: (data: SidebarMenu) => { set({ sidebarMenus: data }) },

  setUser: (user: User) => { set({ user }); },
  setRoles: (role: string) => {
    const user = get().user;
    if (!user) return;

    const currentRoles = Array.isArray(user.roles) ? user.roles : [];

    // 중복 체크 포함
    if (!currentRoles.includes(role)) {
      set({
        user: {
          ...user,
          roles: Array.from(new Set([...(user.roles || []), role]))
        }
      });
    }
  },
  removeRole: (role: string) => {
    const user = get().user;
    if (!user) return;

    set({
      user: {
        ...user,
        roles: (user.roles || []).filter((r: string) => r !== role)
      }
    });
  },

  ...(BACKEND === 'postgres'
    ? createPostgresAuthSlice(set, get)
    : createFirebaseAuthSlice(set, get)),

  ...(BACKEND === 'postgres'
    ? createUISlice(set, get)
    : createUISlice(set, get)),

  setUserAndLoadData: async (user: any) => {
    set({ user });
    const includeAdminAccount = process.env.NEXT_PUBLIC_ADMIN_ACCOUNT ?? [''];
    
    /* ---------------------------------------------------
    * Firebase 로그인 사용자 Firestore upsert 처리
    * ---------------------------------------------------*/
    if (BACKEND === "firebase" && user?.uid) {
      try {
        const usersRef = collection(get().db, "users");
        const userRef = doc(usersRef, user.uid);
        const snap = await getDoc(userRef);

        const baseData = {
          sub: user.uid,
          email: user.email ?? null,
          name: user.displayName ?? "",
          avatar_url: user.photoURL ?? null,
          provider: "google",
          roles: user.roles ?? ["user"],
        };

        if (!snap.exists()) {
          // 신규 사용자 → 자동 등록
          await setDoc(userRef, {
            ...baseData,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
        } else {
          // 기존 사용자 → 마지막 접속시간만 업데이트
          await setDoc(
            userRef,
            { lastLoginAt: serverTimestamp() },
            { merge: true }
          );
        }
        set({ user: snap.data() });
      } catch (err) {
        console.error("🔥 Firestore 사용자 upsert 실패:", err);
      }
    }

    if (!Array.isArray(user.roles)) {
      // 기본 user role
      get().setRoles('user');

      // 이메일이 admin 리스트에 있으면 admin도 추가
      if (user.email && includeAdminAccount.includes(user.email)) {
        get().setRoles('admin');
      }
    } else {
      // 이미 roles 배열이 있는 경우에도, 이메일 기준으로 admin 추가하고 싶으면
      if (user.email && includeAdminAccount.includes(user.email)) {
        get().setRoles('admin');
      }
    }

    if (BACKEND === 'postgres') {
      try {
        // const batch = writeBatch(get().db);
        let updatesNeeded = 0;
        if (updatesNeeded > 0) {

        } else {
          console.log("No conversation migration needed.");
        }
      } catch (error) {
        console.error("Conversation migration failed:", error);
      }

      try {
        const theme = localStorage.getItem("theme") || "light";
        const fontSize = localStorage.getItem("fontSize") || "default";
        const language = localStorage.getItem("language") || "ko";

        set({
          theme,
          fontSize,
          language,
          messages: getInitialMessages(language),
        });
      } catch (error) {
        console.error("Error loading settings:", error);
        const theme = localStorage.getItem("theme") || "light";
        const fontSize = localStorage.getItem("fontSize") || "default";
        const language = localStorage.getItem("language") || "ko";
        set({
          theme,
          fontSize,
          language,
          messages: getInitialMessages(language),
        });
      }
    } else {
      try {
        const batch = writeBatch(get().db);
        let updatesNeeded = 0;
        if (updatesNeeded > 0) {
          await batch.commit();
          console.log(
            `Migration complete: ${updatesNeeded} conversations updated.`
          );
        } else {
          console.log("No conversation migration needed.");
        }
      } catch (error) {
        console.error("Conversation migration failed:", error);
      }

      try {
        const userSettingsRef = doc(get().db, "settings", user.uid ?? user?.sub);
        const docSnap = await getDoc(userSettingsRef);
        const settings = docSnap.exists() ? docSnap.data() : {};

        const theme = settings.theme || localStorage.getItem("theme") || "light";
        const fontSize =
          settings.fontSize || localStorage.getItem("fontSize") || "default";
        const language =
          settings.language || localStorage.getItem("language") || "ko";

        set({
          theme,
          fontSize,
          language,
          messages: getInitialMessages(language),
        });
      } catch (error) {
        console.error("Error loading settings from Firestore:", error);
        const theme = localStorage.getItem("theme") || "light";
        const fontSize = localStorage.getItem("fontSize") || "default";
        const language = localStorage.getItem("language") || "ko";
        set({
          theme,
          fontSize,
          language,
          messages: getInitialMessages(language),
        });
      }
    }
  },

  clearUserAndData: () => {

    let theme = "light";
    let fontSize = "default";
    let language = "ko";
    if (typeof window !== "undefined") {
      theme = localStorage.getItem("theme") || "light";
      fontSize = localStorage.getItem("fontSize") || "default";
      language = localStorage.getItem("language") || "ko";
    }

    set({
      user: null,
      authChecked: true,
      theme,
      fontSize,
      language,
      messages: getInitialMessages(language),
    });
  },

  initAuth: () => {
    // 구글 로그인 팝업 일 경우에도 처리할 수 있도록 추가
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get("id");

    if (BACKEND === 'postgres') {
      // 1) URL의 test id 우선 처리
      const urlParams = new URLSearchParams(window.location.search);
      const testId = urlParams.get("id");

      // 2) 저장된 토큰 있으면 백엔드에서 me 조회
      const savedToken = typeof window !== 'undefined' ? get().token : null;

      // 토큰으로 유저 복원 시도
      const restoreUserFromToken = async () => {
        try {
          const me = await postgresGetMeApi(savedToken ?? "");
          set({ user: me, token: me.accessToken, authChecked: true });
          await get().setUserAndLoadData(me);
        } catch (e) {
          console.error('initAuth: token invalid, clearing...', e);
          localStorage.removeItem('access_token');
          get().clearUserAndData();
        }
      };

      // testId가 있으면 기존처럼 테스트 로그인 시도
      if (testId) {
        console.log(`Attempting auto login with test ID: ${testId}`);
        setTimeout(() => {
          if (!get().user) {
            get().loginWithTestId(testId);
          } else {
            console.log("User already logged in, skipping auto test login.");
          }
        }, 0);
      } else {
        // 일반 로그인 복구
        restoreUserFromToken();
      }
    } else {
      const savedLoginType = typeof window !== "undefined" ? localStorage.getItem("loginType") : null;
      const savedToken = typeof window !== 'undefined' ? get().token : null;
      // console.log("initAuth: savedToken =", savedToken);
      const restoreFromCookie = async () => {
        try {
          const me = await firebaseGetMeApi(savedToken ?? "");
          set({ user: me, authChecked: true, loginType: "email" });
          await get().setUserAndLoadData(me);
          return true;
        } catch {
          return false;
        }
      };
      
      // 1) testId 우선
      if (testId) {
        console.log(`Attempting auto login with test ID: ${testId}`);

        // Zustand 스토어가 완전히 초기화된 후 실행되도록 setTimeout 사용
        setTimeout(() => {
          // Firebase Auth 상태 확인 전에 테스트 로그인을 시도
          if (!get().user) { // 이미 로그인된 사용자가 없는 경우에만 실행
            get().loginWithTestId(testId);
          } else {
            console.log("User already logged in, skipping auto test login.");
          }
        }, 0);
      }

      // 2) 이전에 email 로그인 이력이 있으면 쿠키 복구 먼저 시도
      if (savedLoginType === "email") {
        restoreFromCookie().then((ok) => {
          if (ok) return;

          // 실패하면 Firebase Auth 흐름으로
          onAuthStateChanged(get().auth, async (fbUser) => {
            if (fbUser) {
              set({ authChecked: true, loginType: "google" });
              await get().setUserAndLoadData(fbUser);
            } else {
              get().clearUserAndData();
            }
          });
        });
        return;
      }

      // 3) 기본은 Firebase Auth
      onAuthStateChanged(get().auth, async (user) => {
        // console.log("Firebase Auth state changed:", user);
        // 이미 테스트 사용자로 로그인되어 있으면 Firebase Auth 상태 변경 무시
        if (get().user?.isTestUser) {
          console.log("Already logged in as test user, ignoring Firebase Auth state change.");
          set({ authChecked: true });
          return;
        }

        if (user) {
          // console.log("User logged in via Firebase Auth:========= > ", user);
          set({ authChecked: true, loginType: "google" });
          get().setUserAndLoadData(user);
        } else {
          // 로그아웃 시에도 URL 파라미터 체크 로직을 다시 타지 않도록 clearUserAndData만 호출
          get().clearUserAndData();
        }
      });
    }
  },
}));

// 초기화 로직은 스토어 생성 후 바로 호출
// useStore.getState().initAuth();