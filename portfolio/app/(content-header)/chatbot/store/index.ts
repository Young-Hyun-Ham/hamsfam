// app/(content-header)/chatbot/store/index.ts
"use client";

import { create } from "zustand";
import { ChatMessage, ChatSession } from "../types";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ChatbotState {
  sessions: ChatSession[];
  activeSessionId: string | null;

  // 세션 관련
  createSession: (title?: string, firstMessages?: ChatMessage[]) => string;
  setActiveSession: (id: string) => void;

  // 메시지 관련
  addMessageToActive: (message: ChatMessage) => void;
  patchMessage: (
    sessionId: string,
    messageId: string,
    patch: Partial<ChatMessage>
  ) => void;
}

const useChatbotStore = create<ChatbotState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (title = "새 채팅", firstMessages = []) => {
    const id = createId("session");
    const now = new Date().toISOString();

    const session: ChatSession = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      messages: firstMessages,
    };

    set((state) => ({
      sessions: [session, ...state.sessions], // 최근 것이 위로 오게
      activeSessionId: id,
    }));

    return id;
  },

  setActiveSession: (id) => {
    set((state) => {
      const exists = state.sessions.some((s) => s.id === id);
      return exists ? { activeSessionId: id } : state;
    });
  },

  addMessageToActive: (message) => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return;

    const now = new Date().toISOString();

    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            messages: [...s.messages, message],
            updatedAt: now,
          }
        : s
    );

    set({ sessions: nextSessions });
  },

  patchMessage: (sessionId, messageId, patch) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id !== sessionId
          ? s
          : {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m
              ),
            }
      ),
    }));
  },
}));

export default useChatbotStore;
