// app/(content-header)/ai-chat/components/ChatMessageList.tsx
"use client";

import type { ChatMessage } from "../types";
import ChatMessageBubble from "./ChatMessageBubble";

export default function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="space-y-2">
      {messages.map((m) => (
        <ChatMessageBubble key={m.id} msg={m} />
      ))}
    </div>
  );
}
