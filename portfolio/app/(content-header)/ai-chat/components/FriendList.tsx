// app/(content-header)/ai-chat/components/FriendList.tsx
"use client";

import { useChatUIStore } from "../store";
import ListItem from "./ListItem";

export default function FriendList() {
  const friends = useChatUIStore((s) => s.friends);

  return (
    <div className="space-y-1">
      {friends.length === 0 ? (
        <div className="px-3 py-2 text-[12px] text-slate-500/80">친구가 없습니다.</div>
      ) : friends.map((f) => (
        <ListItem
          key={f.id}
          title={f.name}
          subtitle={f.status ?? ""}
        />
      ))}
    </div>
  );
}
