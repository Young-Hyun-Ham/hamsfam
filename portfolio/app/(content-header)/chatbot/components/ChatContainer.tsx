// app/(content-header)/chatbot/components/ChatContainer.tsx
"use client";

import { useRef, useState } from "react";
import { cn } from "../utils";
import ChatMessageItem from "./ChatMessageItem";
import ChatInput from "./ChatInput";
import { ChatMessage } from "../types";
import {
  SidebarToggleIcon,
  NewChatIcon,
  HistoryIcon,
} from "./Icons";
import ScenarioMenuPanel from "./ScenarioMenuPanel";
import ScenarioPanel from "./ScenarioPanel";

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "안녕하세요! 👋\nReact-Flow 빌더로 만든 시나리오를 기반으로 대화할 준비가 되어 있어요.\n아래에 메시지를 입력해 보세요.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<"new" | "history">("new");

  const [scenarioPanelOpen, setScenarioPanelOpen] = useState(false);
  const [scenarioPanelData, setScenarioPanelData] = useState({
    title: "",
    content: null as React.ReactNode | null,
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleStartScenario = (preset: any) => {
    setScenarioPanelData({
      title: preset.primary, 
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            시나리오 시작 노드 내용…
          </p>
          {/* 예시 버튼 */}
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm">
              Booking No.
            </button>
            <button className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm">
              Container No.
            </button>
          </div>
        </div>
      ),
    });
    setScenarioPanelOpen(true);
  };


  // const [messages, setMessages] = useState<ChatMessage[]>([
  //   // 초기 assistant 메시지...
  // ]);
  // const [isSending, setIsSending] = useState(false);

  // // 👇 textarea 포커스를 위해 부모에서 ref 생성
  // const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = async (text: string) => {
    const now = new Date().toISOString();

    // 1) 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: `user-${now}`,
      role: "user",
      content: text,
      createdAt: now,
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsSending(true);

    // 2) 비어 있는 assistant 메시지를 하나 만들어 놓고,
    //    스트림 chunk 를 여기 content 에 이어 붙인다.
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/chat/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunk = decoder.decode(value || new Uint8Array(), {
          stream: !done,
        });

        if (chunk) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        }
      }
    } catch (err) {
      console.error("Gemini chat error:", err);
      // 에러 메시지를 assistant 로 표시해도 됨
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  m.content || "⚠️ 답변 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
      // 👇 스트림이 완전히 끝난 후 textarea 포커스
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleNewChat = () => {
    setActiveMenu("new");
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "새 채팅을 시작했습니다. 시나리오에 맞게 메시지를 입력해 보세요.",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="flex h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* ===== 단일 사이드바 ===== */}
      <aside
        className={cn(
          "flex h-full flex-col border-r border-gray-200 bg-white/95 shadow-sm transition-all duration-200",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        {/* 상단 토글 + 로고 영역 */}
        <div
          className={cn(
            "flex items-center border-b border-gray-100 px-2 py-3",
            sidebarOpen ? "justify-between" : "justify-center"
          )}
        >
          {sidebarOpen && (
            <span className="ml-1 text-sm font-semibold text-gray-900">
              시나리오 챗봇
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-md p-1 hover:bg-gray-100"
            title={sidebarOpen ? "패널 접기" : "패널 펼치기"}
          >
            {sidebarOpen ? <SidebarToggleIcon /> : <SidebarToggleIcon />}
          </button>
        </div>

        {/* 메뉴 영역 */}
        <nav className="flex-1 space-y-1 px-1 py-3">
          {/* 새 채팅 */}
          <button
            type="button"
            onClick={handleNewChat}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm",
              activeMenu === "new"
                ? "bg-emerald-50 text-emerald-700"
                : "text-gray-700 hover:bg-gray-50",
              !sidebarOpen && "justify-center"
            )}
            title="새 채팅"
          >
            <NewChatIcon width={20} height={20} />
            {sidebarOpen && <span>새 채팅</span>}
          </button>

          {/* 히스토리 */}
          <button
            type="button"
            onClick={() => setActiveMenu("history")}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm",
              activeMenu === "history"
                ? "bg-emerald-50 text-emerald-700"
                : "text-gray-700 hover:bg-gray-50",
              !sidebarOpen && "justify-center"
            )}
            title="히스토리"
          >
            <HistoryIcon width={20} height={20} />
            {sidebarOpen && <span>히스토리</span>}
          </button>
        </nav>

        {/* 하단 설명 (히스토리 탭일 때만, 펼쳐진 상태에서만) */}
        {sidebarOpen && activeMenu === "history" && (
          <div className="border-t border-gray-100 px-3 py-3 text-xs text-gray-400">
            히스토리 목록은 나중에 시나리오/세션 데이터와 연동해서 표시할
            예정입니다.
          </div>
        )}
      </aside>

      {/* ===== 우측 채팅 영역 ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단 헤더 */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
          <div className="flex h-12 w-full items-center justify-between px-[20px]">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">
                Scenario Chatbot
              </span>
              <span className="text-xs text-gray-400">
                React-Flow Builder 기반 시나리오 실행
              </span>
            </div>
            <div className="text-[11px] text-gray-400">v0.1 UI Demo</div>
          </div>
        </header>

        {/* 메시지 리스트 */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full w-full pb-24 pt-4 px-[20px]">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                아직 대화가 없습니다. 첫 메시지를 입력해 보세요.
              </div>
            ) : (
              messages.map((m) => <ChatMessageItem key={m.id} message={m} />)
            )}
          </div>
        </main>

        {/* Custom 메뉴 패널 */}
        <ScenarioMenuPanel
          // 나중에 선택 시 채팅창에 자동으로 넣고 싶으면 여기에서 처리
          onSelectPreset={(item) => handleStartScenario(item)}
        />

        {/* 입력 영역 */}
        <ChatInput
          disabled={isSending}
          onSend={handleSend}
          textareaRef={textareaRef}
        />
      </div>

      {/* 우측 시나리오 패널 */}
      <ScenarioPanel
        open={scenarioPanelOpen}
        scenarioTitle={scenarioPanelData.title}
        nodeContent={scenarioPanelData.content}
        onClose={() => setScenarioPanelOpen(false)}
      />
    </div>
  );
}
