// app/(content-header)/ai-chat/components/ChatWindow.tsx
"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessageList from "./ChatMessageList";
import ChatComposer from "./ChatComposer";
import { useChatUIStore } from "../store";
import { useChatMessagesStore } from "../store/chatMessages";

export default function ChatWindow() {
  const selectedRoomId = useChatUIStore((s) => s.selectedRoomId) ?? "r3";
  const ensureRoom = useChatMessagesStore((s) => s.ensureRoom);
  const sendText = useChatMessagesStore((s) => s.sendText);
  const pushSystem = useChatMessagesStore((s) => s.pushSystem);

  // ✅ 핵심: 함수(getRoom)로 가져오지 말고, rooms[roomId].messages를 직접 구독
  const messages = useChatMessagesStore(
    (s) => s.rooms[selectedRoomId]?.messages ?? []
  );

  const [chatbotEnabled, setChatbotEnabled] = useState(false);

  const title = "홍길동";
  const subtitle = "2";

  const listWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureRoom(selectedRoomId);
  }, [ensureRoom, selectedRoomId]);

  useEffect(() => {
    // 새 메시지 추가 시 아래로
    const el = listWrapRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    try {
      const storageItem = localStorage.getItem("chatbotEnabled");
      if (storageItem === null) return;
      setChatbotEnabled(storageItem === "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("chatbotEnabled", chatbotEnabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [chatbotEnabled]);

  const onSend = (text: string) => {
    sendText(selectedRoomId, text);
  };

  const onMenuSelect = (key: "chatbot") => {
    if (key === "chatbot") {
      pushSystem(selectedRoomId, "🤖 chatbot 메뉴를 선택했어요. 이제부터 AI도 같이 대화를 합니다");
    }
  };

  const onToggleChatbot = (next: boolean) => {
    setChatbotEnabled(next);
    pushSystem(selectedRoomId, next ? "🤖 chatbot 실행됨" : "🛑 chatbot 종료됨");
  };

  const headerActions = useMemo(
    () => [
      { key: "search", label: "검색" },
      { key: "call", label: "통화" },
      { key: "video", label: "영상" },
      { key: "menu", label: "메뉴" },
    ],
    []
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#c7d7e6]">
      <ChatHeader title={title} subtitle={subtitle} actions={headerActions} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={listWrapRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2"
        >
          <ChatMessageList messages={messages} />
        </div>

        <div className="bg-white/80 backdrop-blur-sm">
          <ChatComposer
            onSend={onSend}
            onMenuSelect={onMenuSelect}
            chatbotEnabled={chatbotEnabled}
            onToggleChatbot={onToggleChatbot}
          />
        </div>
      </div>
    </div>
  );
}
