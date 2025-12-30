// app/(content-header)/ai-chat/components/ChatComposer.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type ComposerMenuKey = "chatbot";

export default function ChatComposer({
  onSend,
  onMenuSelect,
  chatbotEnabled,
  onToggleChatbot,
}: {
  onSend: (text: string) => void;
  onMenuSelect?: (key: ComposerMenuKey) => void;
  chatbotEnabled: boolean;
  onToggleChatbot: (next: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
  };

  // 바깥 클릭/ESC로 닫기
  useEffect(() => {
    if (!menuOpen) return;

    const onDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setMenuOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const toggleChatbot = () => {
    const next = !chatbotEnabled;
    onToggleChatbot(next);
    setMenuOpen(false); // ✅ 토글 후 닫기 (원하면 false 제거)
  };

  const selectMenu = (key: ComposerMenuKey) => {
    setMenuOpen(false);
    onMenuSelect?.(key);
  };

  return (
    <div ref={wrapRef} className="relative flex items-end gap-2 p-3">
      {/* + 버튼 */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
        aria-label="추가"
        title="추가"
      >
        +
      </button>

      {/* 레이어 메뉴 (좌측 하단 + 위로 뜨는 스타일) */}
      {menuOpen ? (
        <div className="absolute bottom-[64px] left-3 z-50 w-80 overflow-hidden rounded-2xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] ring-1 ring-black/10">
          <div className="px-3 py-2 text-[12px] font-semibold text-slate-700/80">
            추가 메뉴
          </div>

          <div className="h-px bg-black/5" />

          {/* chatbot 토글 메뉴 */}
          <button
            type="button"
            onClick={toggleChatbot}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-black/[0.03]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-black/5">
              🤖
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-[13px] font-semibold text-slate-900">
                  chatbot
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    chatbotEnabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {chatbotEnabled ? "실행중" : "종료됨"}
                </span>
              </div>
              <div className="truncate text-[12px] text-slate-600">
                {chatbotEnabled ? "클릭하면 종료" : "클릭하면 실행"}
              </div>
            </div>

            {/* 스위치 UI(표시용) */}
            <span
              aria-hidden
              className={`relative h-6 w-11 rounded-full transition ${
                chatbotEnabled ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  chatbotEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
          </button>

          <div className="px-3 py-2 text-[11px] text-slate-500">
            ESC 또는 바깥 클릭으로 닫기
          </div>
        </div>
      ) : null}

      {/* 입력창 */}
      <div className="flex min-h-[44px] flex-1 items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력"
          rows={1}
          className="max-h-28 min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-[13px] outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      <button
        type="button"
        onClick={submit}
        className="h-10 rounded-2xl bg-slate-900 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.99]"
      >
        전송
      </button>
    </div>
  );
}
