// app/(content-header)/chatbot/components/ChatInput.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export default function ChatInput({ disabled, onSend, textareaRef }: Props) {
  const [value, setValue] = useState("");

  // 자동 높이 + 10줄 제한
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const lineHeight = 20;
    const maxLines = 10;
    const maxHeight = lineHeight * maxLines;

    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;

    const newHeight = Math.min(scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, textareaRef]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  // ✅ 지금 요구사항: Enter = 줄바꿈, Shift+Enter = 전송
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    // Enter 단독은 기본 동작(줄바꿈) 유지
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white px-[20px] py-2"
    >
      <div className="max-w-4xl mx-auto flex gap-2 items-stretch">
        <div className="flex-1 flex">
          <textarea
            ref={textareaRef}
            className="w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-2
                       text-sm text-gray-900 placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                       leading-[20px]"
            rows={1}
            placeholder="메시지를 입력하세요. (Enter: 줄바꿈, Shift+Enter: 전송)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={{ maxHeight: 200, overflowY: "hidden" }}
          />
        </div>

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="self-stretch px-5 rounded-full bg-emerald-600 text-white text-sm font-medium
                     border border-transparent shadow-sm hover:bg-emerald-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center min-h-[38px]"
        >
          전송
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] text-gray-400">
        이 채팅은 React-Flow 빌더 시나리오와 연동될 예정입니다.
      </p>
    </form>
  );
}
