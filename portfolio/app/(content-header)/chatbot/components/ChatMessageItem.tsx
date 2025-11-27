// chatbot/components/ChatMessageItem.tsx
"use client";

import { ChatMessage } from "../types";
import { cn } from "../utils";

type Props = {
  message: ChatMessage;
};

const roleLabel: Record<ChatMessage["role"], string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

export default function ChatMessageItem({ message }: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    // 한 줄 전체 폭 (부모 컬럼 기준) + 위아래 여백
    <div className="w-full py-3">
      {/* ▶ 여기 row 가 전체 폭을 쓰고, 좌/우 끝으로 붙음 */}
      <div
        className={cn(
          "flex items-start gap-3 w-full",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {/* assistant / system일 때만 왼쪽 아바타 */}
        {!isUser && (
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
              {isAssistant ? "AI" : "S"}
            </div>
          </div>
        )}

        {/* 말풍선 영역: 여기만 폭 제한 */}
        <div
          className={cn(
            "flex max-w-[80%] flex-col gap-1",
            isUser ? "items-end" : "items-start"
          )}
        >
          <div className="text-xs text-gray-500 mb-0.5">
            {roleLabel[message.role]}
          </div>

          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
              isUser
                ? "bg-emerald-600 text-white rounded-br-sm"
                : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
            )}
          >
            {message.content}
          </div>
        </div>

        {/* user일 때는 오른쪽 아바타 */}
        {isUser && (
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-semibold">
              U
            </div>
          </div>
        )}
      </div>
    </div>
  );
}