// app/(content-header)/ai-chat/store/chatEngineStore.ts
"use client";

import { create } from "zustand";
import type { ChatMessage } from "../types";

type Awaiting =
  | { kind: "slot"; nodeId: string; slot: string; next: string }
  | { kind: "branch"; nodeId: string; routes: Record<string, string> };

type EngineResp = {
  ok: boolean;
  runId: string;
  messages: Array<{
    ts: string;
    role: "assistant" | "user";
    content: string;
    meta?: any;
  }>;
  slots: Record<string, any>;
  vars: Record<string, any>;
  trace: any[];
  awaiting: Awaiting | null;
  state: any; // 다음 턴에 그대로 넣어 이어가기
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function kstTimeLabel(d = new Date()) {
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh < 12 ? "오전" : "오후";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${ampm} ${h12}:${mm}`;
}

const ENGINE_URL = process.env.NEXT_PUBLIC_SCENARIO_ENGINE_URL ?? "http://localhost:8000";

async function callRunScenario(payload: any): Promise<EngineResp> {
  const res = await fetch(`${ENGINE_URL}/runScenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`runScenario HTTP ${res.status} ${msg}`);
  }
  return res.json();
}

type RoomChatState = {
  messages: ChatMessage[];
  engineState: any | null; // FastAPI가 돌려준 state를 그대로 저장
  awaiting: Awaiting | null;
};

type Store = {
  // scenario graph(=builder nodes/edges)도 store에서만 관리 (원하면 room별로 분리 가능)
  nodes: any[];
  edges: any[];
  setScenario: (nodes: any[], edges: any[]) => void;

  // room별 대화
  room: Record<string, RoomChatState>;
  ensureRoom: (roomId: string) => void;
  getRoom: (roomId: string) => RoomChatState;

  // actions
  sendText: (roomId: string, text: string) => Promise<void>;
  pickQuickReply: (
    roomId: string,
    value: string,
    display?: string
  ) => Promise<void>;
};

const emptyRoom: RoomChatState = {
  messages: [],
  engineState: null,
  awaiting: null,
};

export const useChatEngineStore = create<Store>((set, get) => ({
  nodes: [],
  edges: [],
  setScenario: (nodes, edges) => set({ nodes, edges }),

  room: {},
  ensureRoom: (roomId) =>
    set((s) => {
      if (s.room[roomId]) return s;
      return { room: { ...s.room, [roomId]: { ...emptyRoom } } };
    }),

  getRoom: (roomId) => get().room[roomId] ?? { ...emptyRoom },

  sendText: async (roomId, text) => {
    const t = text.trim();
    if (!t) return;

    get().ensureRoom(roomId);

    // 1) 내 메시지 먼저 store에 push
    set((s) => {
      const r = s.room[roomId] ?? { ...emptyRoom };
      const nextMsg: ChatMessage = {
        id: uid(),
        role: "me",
        text: t,
        time: kstTimeLabel(),
      };
      return {
        room: {
          ...s.room,
          [roomId]: { ...r, messages: [...r.messages, nextMsg] },
        },
      };
    });

    // 2) LangGraph 호출
    const { nodes, edges } = get();
    const prev = get().room[roomId]?.engineState ?? null;

    const out = await callRunScenario({
      nodes,
      edges,
      text: t,
      state: prev,
      action: null,
    });

    // 3) assistant 메시지 반영 (서버 messages 중 assistant만 UI에 표시)
    set((s) => {
      const r = s.room[roomId] ?? { ...emptyRoom };

      const assistantMsgs = (out.messages ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => {
          const meta = m.meta ?? {};
          const quickReplies = meta.quickReplies ?? null;

          const uiMsg: ChatMessage = {
            id: uid(),
            role: meta.type === "slotfilling" || meta.type === "branch" ? "other-ai" : "other",
            text: m.content,
            time: kstTimeLabel(),
            // 렌더링용 메타(옵션)
            meta: quickReplies ? { quickReplies, nodeType: meta.type } : undefined,
          };
          return uiMsg;
        });

      return {
        room: {
          ...s.room,
          [roomId]: {
            ...r,
            messages: [...r.messages, ...assistantMsgs],
            engineState: out.state,
            awaiting: out.awaiting ?? null,
          },
        },
      };
    });
  },

  pickQuickReply: async (roomId, value, display = "") => {
    get().ensureRoom(roomId);

    const { nodes, edges } = get();
    const prev = get().room[roomId]?.engineState ?? null;

    const out = await callRunScenario({
      nodes,
      edges,
      text: "", // 버튼은 텍스트 입력이 아니라 action으로 처리 :contentReference[oaicite:1]{index=1}
      state: prev,
      action: { type: "reply", value, display },
    });

    set((s) => {
      const r = s.room[roomId] ?? { ...emptyRoom };

      const assistantMsgs = (out.messages ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => {
          const meta = m.meta ?? {};
          const quickReplies = meta.quickReplies ?? null;

          const uiMsg: ChatMessage = {
            id: uid(),
            role: meta.type === "slotfilling" || meta.type === "branch" ? "other-ai" : "other",
            text: m.content,
            time: kstTimeLabel(),
            meta: quickReplies ? { quickReplies, nodeType: meta.type } : undefined,
          };
          return uiMsg;
        });

      return {
        room: {
          ...s.room,
          [roomId]: {
            ...r,
            messages: [...r.messages, ...assistantMsgs],
            engineState: out.state,
            awaiting: out.awaiting ?? null,
          },
        },
      };
    });
  },
}));
