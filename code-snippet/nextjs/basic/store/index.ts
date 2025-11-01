// app/store/index.js
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
} from "@/lib/firebase";
import { locales } from "@/lib/locales";
import { createAuthSlice } from "@/store/slice/authSlice";
import { createUISlice } from "@/store/slice/uiSlice";

const getInitialMessages = (lang: any = "ko") => {
  return [
    { id: "initial", sender: "bot", text: locales[lang].initialBotMessage },
  ];
};

export const useStore: any = create((set: any, get: any) => ({
  db,
  auth,

  ...createAuthSlice(set, get),
  ...createUISlice(set, get),

  setUserAndLoadData: async (user: any) => {
    set({ user });

    try {
      console.log("Checking for conversation migration...");
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
      const userSettingsRef = doc(get().db, "settings", user.uid);
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

    onAuthStateChanged(get().auth, async (user) => {
      console.log("Firebase Auth state changed:", user);
      // 이미 테스트 사용자로 로그인되어 있으면 Firebase Auth 상태 변경 무시
      if (get().user?.isTestUser) {
        console.log("Already logged in as test user, ignoring Firebase Auth state change.");
        return;
      }

      if (user) {
        console.log("User logged in via Firebase Auth:", user);
        get().setUserAndLoadData(user);
      } else {
        // 로그아웃 시에도 URL 파라미터 체크 로직을 다시 타지 않도록 clearUserAndData만 호출
        get().clearUserAndData();
      }
    });
  },
}));

// 초기화 로직은 스토어 생성 후 바로 호출
// useStore.getState().initAuth();