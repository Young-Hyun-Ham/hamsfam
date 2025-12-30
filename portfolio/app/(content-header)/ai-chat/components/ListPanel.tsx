// app/(content-header)/ai-chat/components/ListPanel.tsx
"use client";

import { useChatUIStore } from "../store";
import ChatList from "./ChatList";
import FriendList from "./FriendList";

export default function ListPanel() {
  const leftTab = useChatUIStore((s) => s.leftTab);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-lg font-semibold text-slate-900">
          {leftTab === "friends" ? "친구" : leftTab === "chats" ? "채팅" : "더보기"}
        </div>

        <div className="flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10">
            ⌕
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10">
            ＋
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {leftTab === "friends" ? (
          <FriendList />
        ) : leftTab === "chats" ? (
          <ChatList />
        ) : (
          <div className="px-2 py-2 text-sm text-slate-600">
            더보기 메뉴(공지/설정/파일 등) 영역
          </div>
        )}
      </div>
    </div>
  );
}
