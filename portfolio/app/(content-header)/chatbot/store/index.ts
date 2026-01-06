// app/(content-header)/chatbot/store/index.ts
"use client";

import { create } from "zustand";
import { api } from "@/lib/axios";
import type { ChatMessage, ChatSession, ScenarioRunState, ChatbotUserDoc } from "../types";
import { subscribeMessages, subscribeSessions, subscribeUserDoc } from "../services/chatbotFirebaseService";
import type { ShortcutMenu, ShortcutMenuSearchParams } from "../types/shortcutMenu";

export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_SYSTEM_PROMPT_KO ??
  "당신은 react-admin 프로젝트의 개발을 돕는 조력자입니다.";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND ?? "firebase").toLowerCase();

// -------- API helpers (firebase/postgres 스위치 유지) --------
async function apiPatchUser(userKey: string, patch: Partial<ChatbotUserDoc>) {
  const { data } = await api.patch(`/api/chatbot/${BACKEND}/user`, { userKey, patch });
  if (data?.ok === false) throw new Error(data?.message || "patch user failed");
}

async function apiCreateSession(userKey: string, payload: { title: string; createdAt: string }) {
  const { data } = await api.post(`/api/chatbot/${BACKEND}/sessions`, { userKey, ...payload });
  if (data?.ok === false) throw new Error(data?.message || "create session failed");
  return String(data?.sessionId);
}

async function apiPatchSession(userKey: string, sessionId: string, patch: Partial<ChatSession>) {
  const { data } = await api.patch(`/api/chatbot/${BACKEND}/sessions/${sessionId}`, { userKey, patch });
  if (data?.ok === false) throw new Error(data?.message || "patch session failed");
}

async function apiDeleteSession(userKey: string, sessionId: string) {
  const { data } = await api.delete(`/api/chatbot/${BACKEND}/sessions/${sessionId}`, { data: { userKey } });
  if (data?.ok === false) throw new Error(data?.message || "delete session failed");
}

async function apiCreateMessage(userKey: string, sessionId: string, msg: ChatMessage) {
  const { data } = await api.post(`/api/chatbot/${BACKEND}/sessions/${sessionId}/messages`, { userKey, message: msg });
  if (data?.ok === false) throw new Error(data?.message || "create message failed");
  return String(data?.messageId ?? msg.id);
}

async function apiPatchMessage(userKey: string, sessionId: string, messageId: string, patch: Partial<ChatMessage>) {
  const { data } = await api.patch(`/api/chatbot/${BACKEND}/sessions/${sessionId}/messages/${messageId}`, {
    userKey,
    patch,
  });
  if (data?.ok === false) throw new Error(data?.message || "patch message failed");
}

export async function fetchShortcutMenuList(params: ShortcutMenuSearchParams = {}): Promise<ShortcutMenu[]> {
  const { data } = await api.get(`/api/chatbot/${BACKEND}/shortcut-menus`, { params });
  if (data?.ok === false) throw new Error(data?.message || "load shortcut menu failed");
  return (data?.items ?? []) as ShortcutMenu[];
}

type ChatbotState = {
  userKey: string | null;

  sessions: ChatSession[];
  activeSessionId: string | null;
  systemPrompt: string;

  syncReady: boolean;

  scenarioRuns: Record<string, ScenarioRunState>;
  saveScenarioRun: (runId: string, patch: Partial<ScenarioRunState>) => void;
  clearScenarioRun: (runId: string) => void;

  createSession: (title: string, messages?: ChatMessage[]) => string;
  setActiveSession: (id: string) => void;

  addMessageToActive: (message: ChatMessage) => void;
  patchMessage: (sessionId: string, messageId: string, patch: Partial<ChatMessage> | ((prev: ChatMessage) => ChatMessage)) => void;

  updateSessionTitle: (id: string, title: string) => void;
  deleteSession: (id: string) => void;

  setSystemPrompt: (prompt: string) => void;

  initBackendSync: (userKey: string) => void;
  stopBackendSync: () => void;

  fetchShortcutMenuList: () => Promise<ShortcutMenu[]>;
};

let unsubUser: (() => void) | null = null;
let unsubSessions: (() => void) | null = null;
let unsubMessages: (() => void) | null = null;

const useChatbotStore = create<ChatbotState>((set, get) => ({
  userKey: null,
  sessions: [],
  activeSessionId: null,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,

  syncReady: false,

  scenarioRuns: {},
  saveScenarioRun: (runId, patch) =>
    set((state) => {
      const prev = state.scenarioRuns[runId] ?? {
        scenarioKey: patch.scenarioKey ?? "",
        scenarioTitle: patch.scenarioTitle,
        steps: [],
        slotValues: {},
        formValues: {},
        currentNodeId: null,
        finished: false,
      };
      return { scenarioRuns: { ...state.scenarioRuns, [runId]: { ...prev, ...patch } } };
    }),
  clearScenarioRun: (runId) =>
    set((state) => {
      const next = { ...state.scenarioRuns };
      delete next[runId];
      return { scenarioRuns: next };
    }),

  initBackendSync: (userKey: string) => {
    // cleanup
    unsubUser?.(); unsubUser = null;
    unsubSessions?.(); unsubSessions = null;
    unsubMessages?.(); unsubMessages = null;

    set({ userKey });

    // 1) user doc
    unsubUser = subscribeUserDoc(userKey, (u) => {
      const sp = u?.systemPrompt?.trim() ? u.systemPrompt : DEFAULT_SYSTEM_PROMPT;
      set({
        syncReady: true,
        systemPrompt: sp,
        activeSessionId: u?.activeSessionId ?? null,
      });

      if (typeof window !== "undefined") window.localStorage.setItem("systemPrompt", sp);

      // activeSession 바뀌면 messages 구독 갈아타기
      const sid = u?.activeSessionId ?? null;
      unsubMessages?.(); unsubMessages = null;

      if (sid) {
        unsubMessages = subscribeMessages(userKey, sid, (msgs) => {
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === sid ? { ...s, messages: msgs } : s)),
          }));
        });
      }
    });

    // 2) sessions list (meta)
    unsubSessions = subscribeSessions(userKey, (items) => {
      set((state) => {
        const activeId = state.activeSessionId ?? items[0]?.id ?? null;

        // active 세션은 기존 messages 유지(구독이 나중에 채워줌)
        const prevActive = state.sessions.find((s) => s.id === activeId)?.messages ?? [];
        const merged = items.map((s) =>
          s.id === activeId ? { ...s, messages: prevActive } : s
        );

        return { sessions: merged, activeSessionId: activeId };
      });
    });
  },

  stopBackendSync: () => {
    unsubUser?.(); unsubUser = null;
    unsubSessions?.(); unsubSessions = null;
    unsubMessages?.(); unsubMessages = null;
    set({ userKey: null, sessions: [], activeSessionId: null, systemPrompt: DEFAULT_SYSTEM_PROMPT, syncReady: false });
  },

  setSystemPrompt: (prompt: string) => {
    const value = prompt.trim() || DEFAULT_SYSTEM_PROMPT;
    set({ systemPrompt: value });
    if (typeof window !== "undefined") window.localStorage.setItem("systemPrompt", value);

    const { userKey } = get();
    if (userKey) apiPatchUser(userKey, { systemPrompt: value }).catch(console.error);
  },

  createSession: (title: string, messages: ChatMessage[] = []) => {
    const tempId = `session-${Date.now()}`;
    const now = new Date().toISOString();

    // optimistic
    set((state) => ({
      sessions: [
        {
          id: tempId,
          title,
          createdAt: now,
          updatedAt: now,
          lastMessagePreview: "",
          lastMessageAt: "",
          messageCount: 0,
          messages: [],
        },
        ...state.sessions,
      ],
      activeSessionId: tempId,
    }));

    const { userKey, systemPrompt } = get();
    if (!userKey) return tempId;

    (async () => {
      // ✅ 서버가 최종 id를 결정(파이어스토어 addDoc이면 보통 여기서 자동 id가 옴)
      const serverId = await apiCreateSession(userKey, { title, createdAt: now });
      const finalId = serverId || tempId;

      // ✅ 서버 id가 tempId와 다르면: 로컬 state에서 id 교체
      if (finalId !== tempId) {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === tempId ? { ...s, id: finalId } : s
          ),
          activeSessionId: state.activeSessionId === tempId ? finalId : state.activeSessionId,
        }));
      }

      // ✅ activeSessionId도 "최종 id"로 저장해야 중복 생성이 안 남
      await apiPatchUser(userKey, { activeSessionId: finalId, systemPrompt });

      // ✅ seed messages도 최종 id로 저장
      for (const m of messages) {
        await apiCreateMessage(userKey, finalId, m);
      }
    })().catch(console.error);

    return tempId; // UI는 즉시 tempId로 동작, 이후 finalId로 치환됨
  },

  setActiveSession: (id: string) => {
    set({ activeSessionId: id });
    const { userKey } = get();
    if (userKey) apiPatchUser(userKey, { activeSessionId: id }).catch(console.error);
  },

  addMessageToActive: (message: ChatMessage) => {
    const { userKey, activeSessionId } = get();
    if (!activeSessionId) return;

    // optimistic UI (활성 세션만 messages를 들고 있음)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === activeSessionId ? { ...s, messages: [...s.messages, message] } : s
      ),
    }));

    if (!userKey) return;

    // server write (message 1건)
    apiCreateMessage(userKey, activeSessionId, message).catch(console.error);
  },

  patchMessage: (sessionId, messageId, patch) => {
    const { userKey } = get();

    // optimistic
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (m.id !== messageId) return m;
            return typeof patch === "function" ? patch(m) : { ...m, ...patch };
          }),
        };
      }),
    }));

    if (!userKey) return;

    // server patch (message 1건)
    const computed =
      typeof patch === "function"
        ? null
        : (patch as Partial<ChatMessage>);

    // 함수형 patch는 서버에 그대로 못 보내니, 현재 state에서 재계산해서 보내자(최소 구현)
    const msg =
      get()
        .sessions.find((s) => s.id === sessionId)
        ?.messages.find((m) => m.id === messageId) ?? null;

    if (!msg) return;

    apiPatchMessage(userKey, sessionId, messageId, computed ?? msg).catch(console.error);
  },

  updateSessionTitle: (id: string, title: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
    }));

    const { userKey } = get();
    if (!userKey) return;
    apiPatchSession(userKey, id, { title }).catch(console.error);
  },

  deleteSession: (id: string) => {
    const { userKey, activeSessionId } = get();

    set((state) => {
      const next = state.sessions.filter((s) => s.id !== id);
      const nextActive = activeSessionId === id ? next[0]?.id ?? null : activeSessionId;
      return { sessions: next, activeSessionId: nextActive };
    });

    if (!userKey) return;

    (async () => {
      await apiDeleteSession(userKey, id);
      // active 세션이 삭제된 경우 user doc도 정리
      const nextActive = get().activeSessionId;
      await apiPatchUser(userKey, { activeSessionId: nextActive ?? null });
    })().catch(console.error);
  },

  fetchShortcutMenuList: () => fetchShortcutMenuList(),
}));

export default useChatbotStore;
