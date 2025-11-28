// app/(content-header)/chatbot/store/index.ts
"use client";

import { create } from "zustand";
import { ChatMessage, ChatSession } from "../types";
import {
  subscribeChatbotSessions,
  saveChatbotSessions,
} from "../services/chatbotFirebaseService";

// ⚠️ 클라이언트에서 쓸 거라면 NEXT_PUBLIC_ 접두사를 쓰는 게 안전함
export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_SYSTEM_PROMPT_KO ??
  "당신은 react-admin 프로젝트의 개발을 돕는 조력자입니다.";

type ChatbotState = {
  userKey: string | null;
  sessions: ChatSession[];
  activeSessionId: string | null;
  systemPrompt: string;

  // 기존 액션들
  createSession: (title: string, messages?: ChatMessage[]) => string;
  setActiveSession: (id: string) => void;
  addMessageToActive: (message: ChatMessage) => void;
  patchMessage: (
    sessionId: string,
    messageId: string,
    patch: Partial<ChatMessage> | ((prev: ChatMessage) => ChatMessage)
  ) => void;
  updateSessionTitle: (id: string, title: string) => void;
  deleteSession: (id: string) => void;

  // system prompt 설정
  setSystemPrompt: (prompt: string) => void;

  // Firebase 연동
  initFirebaseSync: (userKey: string) => void;
  stopFirebaseSync: () => void;
};

let unsubscribeFirestore: (() => void) | null = null;

const useChatbotStore = create<ChatbotState>((set, get) => ({
  userKey: null,
  sessions: [],
  activeSessionId: null,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,

  // ---------- Firebase 연동 ----------
  initFirebaseSync: (userKey: string) => {
    // 기존 구독 있으면 정리
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }

    unsubscribeFirestore = subscribeChatbotSessions(userKey, (data) => {
      if (!data) {
        // 문서가 아직 없으면 localStorage or 기본값 사용
        let sp = DEFAULT_SYSTEM_PROMPT;
        if (typeof window !== "undefined") {
          const fromLocal = window.localStorage.getItem("systemPrompt");
          if (fromLocal) sp = fromLocal;
        }

        set({
          userKey,
          sessions: [],
          activeSessionId: null,
          systemPrompt: sp,
        });
        return;
      }

      const sp =
        data.systemPrompt && data.systemPrompt.trim().length > 0
          ? data.systemPrompt
          : DEFAULT_SYSTEM_PROMPT;

      set({
        userKey,
        sessions: data.sessions || [],
        activeSessionId:
          data.activeSessionId ||
          (data.sessions && data.sessions[0]?.id) ||
          null,
        systemPrompt: sp,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("systemPrompt", sp);
      }
    });
  },

  stopFirebaseSync: () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
    set({
      userKey: null,
      sessions: [],
      activeSessionId: null,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    });
  },

  // ---------- system prompt 변경 ----------
  setSystemPrompt: (prompt: string) => {
    const value = prompt.trim() || DEFAULT_SYSTEM_PROMPT;
    set({ systemPrompt: value });

    if (typeof window !== "undefined") {
      window.localStorage.setItem("systemPrompt", value);
    }

    const { userKey, sessions, activeSessionId } = get();
    if (userKey) {
      saveChatbotSessions(userKey, sessions, activeSessionId, value);
    }
  },

  // ---------- 세션 생성 ----------
  createSession: (title: string, messages: ChatMessage[] = []) => {
    const id = `session-${Date.now()}`;
    set((state) => {
      const newSession: ChatSession = {
        id,
        title,
        messages,
      };
      const sessions = [...state.sessions, newSession];
      return { sessions, activeSessionId: id };
    });

    const { userKey, sessions, activeSessionId, systemPrompt } = get();
    if (userKey) {
      saveChatbotSessions(userKey, sessions, activeSessionId, systemPrompt);
    }

    return id;
  },

  // ---------- active 세션 변경 ----------
  setActiveSession: (id: string) => {
    set({ activeSessionId: id });
    const { userKey, sessions, activeSessionId, systemPrompt } = get();
    if (userKey) {
      saveChatbotSessions(userKey, sessions, activeSessionId, systemPrompt);
    }
  },

  // ---------- 메시지 추가 ----------
  addMessageToActive: (message: ChatMessage) => {
    set((state) => {
      if (!state.activeSessionId) return state;
      const sessions = state.sessions.map((s) =>
        s.id === state.activeSessionId
          ? { ...s, messages: [...s.messages, message] }
          : s
      );
      return { sessions };
    });

    const { userKey, sessions, activeSessionId, systemPrompt } = get();
    if (userKey) {
      saveChatbotSessions(userKey, sessions, activeSessionId, systemPrompt);
    }
  },

  // ---------- 메시지 패치 (스트림) ----------
  patchMessage: (sessionId, messageId, patch) => {
    set((state) => {
      const sessions = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const messages = s.messages.map((m) => {
          if (m.id !== messageId) return m;
          if (typeof patch === "function") {
            return patch(m);
          }
          return { ...m, ...patch };
        });
        return { ...s, messages };
      });
      return { sessions };
    });

    const { userKey, sessions, activeSessionId, systemPrompt } = get();
    if (userKey) {
      saveChatbotSessions(userKey, sessions, activeSessionId, systemPrompt);
    }
  },

  // ---------- 세션 제목 변경 ----------
  updateSessionTitle: (id, title) => {
    set((state) => {
      const sessions = state.sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      );
      return { sessions };
    });

    const { userKey, sessions, activeSessionId, systemPrompt } = get();
    if (userKey) {
      saveChatbotSessions(userKey, sessions, activeSessionId, systemPrompt);
    }
  },

  // ---------- 세션 삭제 ----------
  deleteSession: (id) => {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      let activeSessionId = state.activeSessionId;
      if (activeSessionId === id) {
        activeSessionId = sessions[0]?.id ?? null;
      }
      return { sessions, activeSessionId };
    });

    const { userKey, sessions, activeSessionId, systemPrompt } = get();
    if (userKey) {
      saveChatbotSessions(userKey, sessions, activeSessionId, systemPrompt);
    }
  },
}));

export default useChatbotStore;
