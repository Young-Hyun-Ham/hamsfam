// src/lib/ai-chat/stores/chatMessages.ts

import { get, writable } from "svelte/store";
import type { ChatMessage } from "../types";

function uid() {
  return Math.random().toString(36).slice(2);
}

function timeLabel(d = new Date()) {
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh < 12 ? "오전" : "오후";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${ampm} ${h12}:${mm}`;
}

type RoomChat = { messages: ChatMessage[] };

type State = {
  rooms: Record<string, RoomChat>;
};

const seed: ChatMessage[] = [
  // 원본처럼 비워둠
];

function createChatMessagesStore() {
  const { subscribe, update } = writable<State>({
    rooms: {
      r3: { messages: seed },
    },
  });

  const ensureRoom = (roomId: string) =>
    update((s) => {
      if (s.rooms[roomId]) return s;
      return { ...s, rooms: { ...s.rooms, [roomId]: { messages: [] } } };
    });

  const push = (roomId: string, msg: ChatMessage) =>
    update((s) => {
      const room = s.rooms[roomId] ?? { messages: [] };
      return {
        ...s,
        rooms: {
          ...s.rooms,
          [roomId]: { ...room, messages: [...room.messages, msg] },
        },
      };
    });

  const sendText = (roomId: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    ensureRoom(roomId);
    push(roomId, { id: uid(), role: "me", text: t, time: timeLabel() });
  };

  const pushSystem = (roomId: string, text: string) => {
    ensureRoom(roomId);
    push(roomId, { id: uid(), role: "other-ai", text, time: timeLabel() });
  };

  const getRoomMessages = (roomId: string) => {
    const s = get({ subscribe });
    return s.rooms[roomId]?.messages ?? [];
  };

  return { subscribe, ensureRoom, push, sendText, pushSystem, getRoomMessages };
}

export const chatMessages = createChatMessagesStore();
