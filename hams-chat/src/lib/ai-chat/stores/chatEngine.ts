// src/lib/ai-chat/stores/chatEngine.ts

import { get, writable } from "svelte/store";
import type { Awaiting, ChatMessage } from "../types";

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
  state: any;
};

type RoomChatState = {
  messages: ChatMessage[];
  engineState: any | null;
  awaiting: Awaiting | null;
};

type State = {
  nodes: any[];
  edges: any[];
  room: Record<string, RoomChatState>;
};

const emptyRoom: RoomChatState = { messages: [], engineState: null, awaiting: null };

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

async function callRunScenario(payload: any): Promise<EngineResp> {
  const ENGINE_URL = import.meta.env.VITE_PUBLIC_SCENARIO_ENGINE_URL ?? "http://localhost:8000";
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

function createChatEngineStore() {
  const { subscribe, update } = writable<State>({
    nodes: [],
    edges: [],
    room: {
      // ✅ Next 코드처럼 r3 기본 방 시드(원하면 제거)
      r3: { ...emptyRoom, messages: [] },
    },
  });

  const ensureRoom = (roomId: string) =>
    update((s) => {
      if (s.room[roomId]) return s;
      return { ...s, room: { ...s.room, [roomId]: { ...emptyRoom } } };
    });

  const getRoom = (roomId: string) => {
    const s = get({ subscribe });
    return s.room[roomId] ?? { ...emptyRoom };
  };

  const setScenario = (nodes: any[], edges: any[]) =>
    update((s) => ({ ...s, nodes, edges }));

  const sendText = async (roomId: string, text: string) => {
    const t = text.trim();
    if (!t) return;

    ensureRoom(roomId);

    // 1) 내 메시지 push
    update((s) => {
      const r = s.room[roomId] ?? { ...emptyRoom };
      const nextMsg: ChatMessage = { id: uid(), role: "me", text: t, time: kstTimeLabel() };
      return { ...s, room: { ...s.room, [roomId]: { ...r, messages: [...r.messages, nextMsg] } } };
    });

    // 2) 엔진 호출
    const s0 = get({ subscribe });
    const prev = s0.room[roomId]?.engineState ?? null;

    const out = await callRunScenario({
      nodes: s0.nodes,
      edges: s0.edges,
      text: t,
      state: prev,
      action: null,
    });

    // 3) assistant 메시지 반영
    update((s) => {
      const r = s.room[roomId] ?? { ...emptyRoom };
      const assistantMsgs: ChatMessage[] = (out.messages ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => {
          const meta = m.meta ?? {};
          const quickReplies = meta.quickReplies ?? null;
          return {
            id: uid(),
            role: meta.type === "slotfilling" || meta.type === "branch" ? "other-ai" : "other",
            text: m.content,
            time: kstTimeLabel(),
            meta: quickReplies ? { quickReplies, nodeType: meta.type } : undefined,
          };
        });

      return {
        ...s,
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
  };

  const pickQuickReply = async (roomId: string, value: string, display = "") => {
    ensureRoom(roomId);

    const s0 = get({ subscribe });
    const prev = s0.room[roomId]?.engineState ?? null;

    const out = await callRunScenario({
      nodes: s0.nodes,
      edges: s0.edges,
      text: "",
      state: prev,
      action: { type: "reply", value, display },
    });

    update((s) => {
      const r = s.room[roomId] ?? { ...emptyRoom };
      const assistantMsgs: ChatMessage[] = (out.messages ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => {
          const meta = m.meta ?? {};
          const quickReplies = meta.quickReplies ?? null;
          return {
            id: uid(),
            role: meta.type === "slotfilling" || meta.type === "branch" ? "other-ai" : "other",
            text: m.content,
            time: kstTimeLabel(),
            meta: quickReplies ? { quickReplies, nodeType: meta.type } : undefined,
          };
        });

      return {
        ...s,
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
  };

  return { subscribe, setScenario, ensureRoom, getRoom, sendText, pickQuickReply };
}

export const chatEngine = createChatEngineStore();
