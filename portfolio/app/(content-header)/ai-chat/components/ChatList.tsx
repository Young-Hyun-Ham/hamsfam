// app/(content-header)/ai-chat/components/ChatList.tsx
"use client";

import { useChatUIStore } from "../store";
import ListItem from "./ListItem";

export default function ChatList() {
  const rooms = useChatUIStore((s) => s.rooms);
  const selectedRoomId = useChatUIStore((s) => s.selectedRoomId);
  const selectRoom = useChatUIStore((s) => s.selectRoom);

  return (
    <div className="space-y-1">
      {rooms.length === 0 ? (
        <div className="px-3 py-2 text-[12px] text-slate-500/80">채팅 내용이 없습니다.</div>
      ) : rooms.map((r) => (
        <ListItem
          key={r.id}
          title={r.title}
          subtitle={r.lastMessage}
          time={r.time}
          badge={r.unread}
          muted={r.muted}
          selected={r.id === selectedRoomId}
          onClick={() => selectRoom(r.id)}
        />
      ))}
    </div>
  );
}
