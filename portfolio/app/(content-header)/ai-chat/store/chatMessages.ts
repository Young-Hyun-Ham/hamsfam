"use client";

import { create } from "zustand";
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

type RoomChat = {
  messages: ChatMessage[];
};

type Store = {
  rooms: Record<string, RoomChat>;
  ensureRoom: (roomId: string) => void;

  push: (roomId: string, msg: ChatMessage) => void;
  sendText: (roomId: string, text: string) => void;

  pushSystem: (roomId: string, text: string) => void;
};

const seed: ChatMessage[] = [
  // { id: uid(), role: "me", text: "안녕", time: "오전 11:18" },
  // { id: uid(), role: "other", text: "안녕하세요", time: "오전 11:18" },
  // { id: uid(), role: "me", text: "아이스아메리카노는 얼마야.?", time: "오전 11:20" },
  // { id: uid(), role: "me", text: "아이스아메리카노의 가격은 2,000원 입니다.", time: "오후 3:07" },
  // { id: uid(), role: "other", text: "주문해줘", time: "오후 3:24" },
  // { id: uid(), role: "me", text: "수량은요?", time: "오후 3:25" },
  // { id: uid(), role: "other", text: "한개", time: "오후 4:20" },
];

export const useChatMessagesStore = create<Store>((set, get) => ({
  rooms: {
    // ✅ 데모: r3 방에 기본 메시지 넣어둠 (UI store 기본 selectedRoomId가 r3라서)
    r3: { messages: seed },
  },

  ensureRoom: (roomId) =>
    set((s) => {
      if (s.rooms[roomId]) return s;
      return { rooms: { ...s.rooms, [roomId]: { messages: [] } } };
    }),

  push: (roomId, msg) =>
    set((s) => {
      const room = s.rooms[roomId] ?? { messages: [] };
      return {
        rooms: {
          ...s.rooms,
          [roomId]: { ...room, messages: [...room.messages, msg] },
        },
      };
    }),

  sendText: (roomId, text) => {
    const t = text.trim();
    if (!t) return;
    get().ensureRoom(roomId);
    get().push(roomId, { id: uid(), role: "me", text: t, time: timeLabel() });
  },

  pushSystem: (roomId, text) => {
    get().ensureRoom(roomId);
    get().push(roomId, {
      id: uid(),
      role: "other-ai",
      text,
      time: timeLabel(),
    });
  },
}));
