// app/(content-header)/ai-chat/components/ChatMessageBubble.tsx
"use client";

import { useChatUIStore } from "../store";
import { useChatEngineStore } from "../store/chatEngineStore";
import type { ChatMessage } from "../types";

export default function ChatMessageBubble({ msg }: { msg: ChatMessage }) {
  const isMe = msg.role === "me";
  const quickReplies = msg.meta?.quickReplies ?? null;

  const selectedRoomId = useChatUIStore((s) => s.selectedRoomId);
  const awaiting = useChatEngineStore((s) =>
    selectedRoomId ? s.getRoom(selectedRoomId).awaiting : null
  );
  const pickQuickReply = useChatEngineStore((s) => s.pickQuickReply);

  // “현재 awaiting이 걸려있는 상태”일 때만 버튼을 활성화하고 싶으면:
  const canPick = Boolean(awaiting && selectedRoomId);

  return (
    <div className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe ? (
        <div className="h-9 w-9 shrink-0 rounded-2xl bg-white/60 shadow-sm ring-1 ring-black/5" />
      ) : null}

      <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {!isMe ? (
          <div className="mb-0.5 px-1 text-[12px] font-medium text-slate-900/80">
            {msg.role === "other-ai" ? "AI" : "홍길동"}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          {!isMe ? (
            <span className="order-2 text-[11px] text-slate-700/60">{msg.time}</span>
          ) : null}

          <div
            className={[
              "whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ring-1 ring-black/5",
              isMe ? "bg-[#ffe75a] text-slate-900" : "bg-white/95 text-slate-900",
            ].join(" ")}
          >
            {msg.text}
          </div>

          {isMe ? (
            <span className="text-[11px] text-slate-700/60">{msg.time}</span>
          ) : null}
        </div>

        {/* Quick Replies */}
        {!isMe && quickReplies?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {quickReplies.map((r, idx) => (
              <button
                key={`${r.value}-${idx}`}
                type="button"
                disabled={!canPick}
                onClick={() => {
                  if (!selectedRoomId) return;
                  pickQuickReply(selectedRoomId, r.value, r.display ?? "");
                }}
                className={[
                  "rounded-full bg-white/90 px-3 py-1.5 text-[12px] shadow-sm ring-1 ring-black/5 transition",
                  canPick ? "hover:bg-white" : "opacity-50 cursor-not-allowed",
                ].join(" ")}
              >
                {r.display ?? r.value}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
