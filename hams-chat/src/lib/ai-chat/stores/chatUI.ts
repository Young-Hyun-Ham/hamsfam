// src/lib/ai-chat/stores/chatUI.ts

import { writable } from "svelte/store";
import type { ChatRoom, Friend, LeftTab } from "../types";

type State = {
  leftTab: LeftTab;
  leftCollapsed: boolean;
  selectedRoomId: string | null;
  rooms: ChatRoom[];
  friends: Friend[];
};

const demoRooms: ChatRoom[] = [];
const demoFriends: Friend[] = [];

function createChatUIStore() {
  const { subscribe, update, set } = writable<State>({
    leftTab: "chats",
    leftCollapsed: true,
    selectedRoomId: "r3",
    rooms: demoRooms,
    friends: demoFriends,
  });

  return {
    subscribe,
    setLeftTab: (t: LeftTab) => update((s) => ({ ...s, leftTab: t })),
    toggleLeftCollapsed: () => update((s) => ({ ...s, leftCollapsed: !s.leftCollapsed })),
    selectRoom: (id: string) => update((s) => ({ ...s, selectedRoomId: id })),
    reset: () =>
      set({
        leftTab: "chats",
        leftCollapsed: true,
        selectedRoomId: "r3",
        rooms: demoRooms,
        friends: demoFriends,
      }),
  };
}

export const chatUI = createChatUIStore();
