// app/(content-header)/ai-chat/store/index.ts
"use client";

import { create } from "zustand";

export type LeftTab = "friends" | "chats" | "more";

export type ChatRoom = {
  id: string;
  title: string;
  lastMessage: string;
  time: string;
  unread: number;
  muted?: boolean;
  pinned?: boolean;
};

export type Friend = {
  id: string;
  name: string;
  status?: string;
};

type State = {
  leftTab: LeftTab;
  leftCollapsed: boolean;
  selectedRoomId: string | null;

  rooms: ChatRoom[];
  friends: Friend[];

  setLeftTab: (t: LeftTab) => void;
  toggleLeftCollapsed: () => void;
  selectRoom: (id: string) => void;
};

const demoRooms: ChatRoom[] = [
  // { id: "r1", title: "비출서버[굿후렌드]", lastMessage: "이전 하시는겁니까?", time: "오전 9:58", unread: 81, muted: true },
  // { id: "r2", title: "[미리오] 브란트/비...", lastMessage: "그럴수도 ㅡㅡㅋ", time: "오전 9:47", unread: 180, muted: true },
  // { id: "r3", title: "카카오페이", lastMessage: "메시지가 도착했습니다.", time: "오전 9:25", unread: 36 },
  // { id: "r4", title: "뉴스봇", lastMessage: "카카오 관련 뉴스", time: "오전 8:02", unread: 281 },
  // { id: "r5", title: "라그M Artist!", lastMessage: "ㅠㅠ", time: "오전 7:21", unread: 301, muted: true },
];

const demoFriends: Friend[] = [
  // { id: "f1", name: "홍길동", status: "오늘도 화이팅" },
  // { id: "f2", name: "김상철", status: "병원..." },
  // { id: "f3", name: "민광진", status: "외근중" },
];

export const useChatUIStore = create<State>((set) => ({
  leftTab: "chats",
  leftCollapsed: true,
  selectedRoomId: "r3",

  rooms: demoRooms,
  friends: demoFriends,

  setLeftTab: (t) => set({ leftTab: t }),
  toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  selectRoom: (id) => set({ selectedRoomId: id }),
}));
