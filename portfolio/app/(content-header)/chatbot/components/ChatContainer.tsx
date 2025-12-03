// app/(content-header)/chatbot/components/ChatContainer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";

import { cn } from "../utils";
import ChatMessageItem from "./ChatMessageItem";
import ChatInput from "./ChatInput";
import ScenarioMenuPanel from "./ScenarioMenuPanel";
import {
  SidebarToggleIcon,
  NewChatIcon,
  HistoryIcon,
  SmallChevronRightIcon,
  DotsHorizontalIcon,
} from "./Icons";
import { ChatMessage, ChatSession, ScenarioStep } from "../types";
import useChatbotStore, { DEFAULT_SYSTEM_PROMPT } from "../store";
import ScenarioPanel from "./ScenarioPanel";
import {
  Button,
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { SettingsIcon } from "lucide-react";

import ScenarioEmulator from "./ScenarioEmulator";

type ScenarioPanelData = {
  title: string;
  content: React.ReactNode | null;
};

type MenuPosition = { x: number; y: number } | null;

export default function ChatContainer() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 로그인 정보 (uid / email / sub 등)
  const user = useStore((s: any) => s.user);

  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    addMessageToActive,
    patchMessage,
    updateSessionTitle,
    deleteSession,
    initBackendSync: initFirebaseSync,
    systemPrompt,
    setSystemPrompt,
  } = useChatbotStore();

  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  // ▶ 세션 컨텍스트 메뉴 상태
  const [sessionMenuOpenId, setSessionMenuOpenId] = useState<string | null>(
    null
  );
  const [sessionMenuPos, setSessionMenuPos] = useState<MenuPosition>(null);

  // ▶ 제목 인라인 편집 상태
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  // ▶ 시나리오 패널 상태
  const [scenarioData, setScenarioData] = useState<ScenarioPanelData>({
    title: "",
    content: null,
  });

  // ==================== 설정 Popover start ====================
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(
    null
  );
  const settingsOpen = Boolean(settingsAnchor);
  const onOpenSettings = (e: React.MouseEvent<HTMLElement>) =>
    setSettingsAnchor(e.currentTarget);
  const onCloseSettings = () => setSettingsAnchor(null);

  // 임시 입력값 관리(취소 시 되돌리기)
  const [editingPrompt, setEditingPrompt] = useState<string>(systemPrompt);
  useEffect(() => {
    // systemPrompt가 바뀌면 기본 편집값도 맞춰줌
    if (!settingsOpen) setEditingPrompt(systemPrompt);
  }, [settingsOpen, systemPrompt]);

  const applySettings = () => {
    const value = editingPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
    setSystemPrompt(value);
    onCloseSettings();
  };
  const resetToDefault = () => {
    setEditingPrompt(DEFAULT_SYSTEM_PROMPT);
  };
  // ==================== 설정 Popover end ====================

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession?.messages ?? [];
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioKey, setScenarioKey] = useState<string | null>(null);
  const [scenarioTitle, setScenarioTitle] = useState<string>("");

  // shortcut 메뉴에서 시나리오 선택 시 호출하는 기존 로직
  const openScenarioPanel = (key: string, title: string) => {
    setScenarioKey(key);
    setScenarioTitle(title);
    setScenarioOpen(true);
  };

  const handleScenarioHistoryAppend = ({
    scenarioKey,
    scenarioTitle,
    steps,
  }: {
    scenarioKey: string;
    scenarioTitle?: string;
    steps: ScenarioStep[];
  }) => {
    const now = new Date().toISOString();

    // steps를 요약해서 content에 보여줄 문자열로 만들기 (간단 버전)
    const summaryText =
      steps
        .map((s) => (s.role === "bot" ? `봇: ${s.text}` : `사용자: ${s.text}`))
        .join("\n")
        .slice(0, 500) + (steps.length > 0 ? "..." : "");

    const scenarioMessage: ChatMessage = {
      id: `scenario-${scenarioKey}-${Date.now()}`,
      role: "assistant",
      content:
        `🔁 시나리오 실행: ${scenarioTitle || scenarioKey}\n\n` + summaryText,
      createdAt: now,
      kind: "scenario",
      scenarioKey,
      scenarioTitle,
      scenarioSteps: steps,
    };

    addMessageToActive(scenarioMessage);
    // LLM 히스토리는 기존대로 addMessageToActive로 쌓이는 구조 유지
  };

  // 최초 세션 생성
  useEffect(() => {
    if (!activeSessionId) {
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content:
          "안녕하세요! 👋\nReact-Flow 빌더로 만든 시나리오를 기반으로 대화할 준비가 되어 있어요.\n아래에 메시지를 입력해 보세요.",
        createdAt: new Date().toISOString(),
      };
      createSession("새 채팅", [welcomeMsg]);
    }
  }, [activeSessionId, createSession]);

  // 인라인 편집 시작 시 자동 포커스
  useEffect(() => {
    if (editingSessionId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingSessionId]);

  // 사용자 기준 Firestore 연동
  useEffect(() => {
    if (!user) return;

    // 사용자별 고유 키 (Firebase uid, OAuth sub, email 중 하나)
    const key = user.uid || user.sub || user.email;

    if (!key) return;

    initFirebaseSync(key);
  }, [user, initFirebaseSync]);

  const handleNewChat = () => {
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content:
        "새 채팅을 시작했습니다. 시나리오에 맞게 메시지를 입력해 보세요.",
      createdAt: new Date().toISOString(),
    };
    createSession("새 채팅", [welcomeMsg]);
  };

  const closeSessionMenu = () => {
    setSessionMenuOpenId(null);
    setSessionMenuPos(null);
  };

  // ▶ 인라인 이름 변경 시작
  const startInlineRename = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title || "");
    closeSessionMenu();
  };

  // ▶ 인라인 이름 변경 확정
  const commitInlineRename = () => {
    if (!editingSessionId) return;
    const trimmed = editingTitle.trim();
    if (trimmed) {
      updateSessionTitle(editingSessionId, trimmed);
    }
    setEditingSessionId(null);
  };

  // ▶ 인라인 이름 변경 취소
  const cancelInlineRename = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleDeleteSession = (sessionId: string) => {
    const ok = window.confirm("이 채팅방을 삭제하시겠습니까?");
    if (!ok) return;
    deleteSession(sessionId);
    closeSessionMenu();
  };

  // Gemini 스트림
  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content:
          "새 채팅을 시작했습니다. 시나리오에 맞게 메시지를 입력해 보세요.",
        createdAt: new Date().toISOString(),
      };
      currentSessionId = createSession("새 채팅", [welcomeMsg]);
    }

    const now = new Date().toISOString();

    const userMessage: ChatMessage = {
      id: `user-${now}`,
      role: "user",
      content: text,
      createdAt: now,
    };
    addMessageToActive(userMessage);

    setIsSending(true);

    const assistantId = `assistant-${Date.now()}`;
    const assistantBase: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    addMessageToActive(assistantBase);

    try {
      const res = await fetch("/api/chat/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          systemPrompt, // 🔥 시스템 프롬프트도 같이 보냄
          // 나중에 history까지 쓰고 싶으면 여기서 messages도 같이 보낼 수 있음
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunk = decoder.decode(value || new Uint8Array(), {
          stream: !done,
        });

        if (!chunk) continue;

        patchMessage(currentSessionId!, assistantId, (prev) => ({
          ...prev,
          content: (prev.content ?? "") + chunk,
        }));
      }
    } catch (err) {
      console.error("Gemini chat error:", err);
      patchMessage(currentSessionId!, assistantId, {
        content:
          "⚠️ 답변 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* ===== 좌측 사이드바 ===== */}
      <aside
        className={cn(
          "flex h-full flex-col border-r border-gray-200 bg-white/95 shadow-sm transition-all duration-200",
          "overflow-x-hidden",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        {/* 사이드바 헤더 */}
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
            className="group rounded-md p-1 hover:bg-gray-100"
          >
            <SidebarToggleIcon open={sidebarOpen} />
          </button>
        </div>

        {/* 사이드바 내용 */}
        <nav className="flex-1 px-1 py-3 flex flex-col gap-3">
          {/* 새 채팅 버튼 */}
          <button
            type="button"
            onClick={handleNewChat}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
              "text-gray-700 hover:bg-gray-50 border border-transparent",
              "w-full max-w-full overflow-hidden min-w-0",
              !sidebarOpen && "justify-center"
            )}
          >
            <NewChatIcon width={20} height={20} />
            {sidebarOpen && <span>새 채팅</span>}
          </button>

          {/* 히스토리 + 세션 리스트 */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* 히스토리 헤더 */}
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm",
                "text-gray-700 hover:bg-gray-50 border border-transparent",
                !sidebarOpen && "justify-center"
              )}
            >
              <HistoryIcon width={20} height={20} />
              {sidebarOpen && (
                <>
                  <span>히스토리</span>
                  <span
                    className={cn(
                      "ml-auto text-gray-400 transition-transform",
                      historyOpen ? "rotate-90" : "rotate-0"
                    )}
                  >
                    <SmallChevronRightIcon />
                  </span>
                </>
              )}
            </button>

            {/* 세션 리스트 */}
            {sidebarOpen && historyOpen && (
              <div className="mt-1 pl-3 pr-1 text-xs text-gray-600 flex-1 min-h-0">
                <div className="max-h-full overflow-y-auto overflow-x-hidden">
                  {sessions.length === 0 ? (
                    <div className="text-gray-400">
                      저장된 채팅이 없습니다.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {sessions.map((s) => {
                        const isEditing = editingSessionId === s.id;
                        const lastMessage =
                          s.messages[s.messages.length - 1]?.content ??
                          "메시지 없음";

                        return (
                          <li key={s.id} className="relative">
                            <div className="flex items-start min-w-0">
                              {/* 세션 아이템 (보기 / 편집) */}
                              {isEditing ? (
                                <div className="flex-1 min-w-0 rounded-md px-2 py-1.5 bg-emerald-50">
                                  <input
                                    ref={editingInputRef}
                                    className="w-full rounded-sm border border-emerald-300 bg-white px-1.5 py-[3px] text-[13px] outline-none focus:ring-1 focus:ring-emerald-400"
                                    value={editingTitle}
                                    onChange={(e) =>
                                      setEditingTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        commitInlineRename();
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelInlineRename();
                                      }
                                    }}
                                    onBlur={cancelInlineRename}
                                  />
                                  <div className="mt-[4px] text-[11px] text-gray-400 truncate">
                                    {lastMessage}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveSession(s.id)}
                                  className={cn(
                                    "flex-1 min-w-0 rounded-md px-2 py-1.5 text-left hover:bg-gray-50",
                                    s.id === activeSessionId &&
                                      "bg-emerald-50 text-emerald-700"
                                  )}
                                >
                                  <div className="truncate text-[13px] font-medium">
                                    {s.title || "제목 없음"}
                                  </div>
                                  <div className="mt-[2px] text-[11px] text-gray-400 truncate">
                                    {lastMessage}
                                  </div>
                                </button>
                              )}

                              {/* ... 버튼 – 클릭 위치 기준으로 메뉴 띄우기 */}
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();

                                    const x = rect.right + 4;
                                    const y = rect.top + 4;

                                    setSessionMenuOpenId((prev) =>
                                      prev === s.id ? null : s.id
                                    );
                                    setSessionMenuPos({ x, y });
                                  }}
                                  className="ml-1 px-1 py-1 rounded-md hover:bg-gray-100 text-gray-500 shrink-0"
                                >
                                  <DotsHorizontalIcon />
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* ===== 중앙 채팅 영역 ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
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
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <span>v0.1 UI Demo</span>
              <Tooltip title="설정">
                <IconButton onClick={onOpenSettings} size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="h-full w-full pb-24 pt-4 px-[20px]">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                아직 대화가 없습니다. 첫 메시지를 입력해 보세요.
              </div>
            ) : (
              messages.map((m) => (
                <ChatMessageItem
                  key={m.id}
                  message={m}
                  onScenarioClick={(scenarioKey, scenarioTitle) => {
                    // 시나리오 메시지 클릭 시 우측 패널로 다시 실행
                    setScenarioData({
                      title: scenarioTitle || "Scenario",
                      content: (
                        <ScenarioEmulator
                          scenarioKey={scenarioKey}
                          scenarioTitle={scenarioTitle}
                          onHistoryAppend={handleScenarioHistoryAppend}
                        />
                      ),
                    });
                    setScenarioOpen(true);
                  }}
                />
              ))
            )}
          </div>
        </main>

        <ScenarioMenuPanel
          onSelectPreset={(preset) => {
            setScenarioData({
              title: preset.primary,
              content: (
                <ScenarioEmulator
                  scenarioKey={preset.scenarioKey ?? ""}
                  onHistoryAppend={handleScenarioHistoryAppend}
                />
              ),
            });
            setScenarioOpen(true);       // 여기서만 패널 열림
          }}
        />

        <ChatInput
          disabled={isSending}
          onSend={handleSend}
          textareaRef={textareaRef}
        />
      </div>

      {/* 우측 시나리오 패널 */}
      <ScenarioPanel
        open={scenarioOpen}
        scenarioTitle={scenarioData.title}
        nodeContent={scenarioData.content}
        onClose={() => setScenarioOpen(false)}
      />
      
      {/* ===== 세션 컨텍스트 메뉴 (ChatGPT 사이드바 스타일) ===== */}
      {sessionMenuOpenId &&
        sessionMenuPos &&
        (() => {
          const target = sessions.find((s) => s.id === sessionMenuOpenId);
          if (!target) return null;

          return (
            <div className="fixed inset-0 z-40" onClick={closeSessionMenu}>
              <div
                className="absolute w-52 rounded-lg bg-white shadow-xl border border-gray-200 py-2 text-sm"
                style={{ left: sessionMenuPos.x, top: sessionMenuPos.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 pb-1 text-[11px] font-medium text-gray-500 truncate">
                  {target.title || "제목 없음"}
                </div>
                <button
                  type="button"
                  onClick={() => startInlineRename(target)}
                  className="block w-full px-3 py-2 text-left hover:bg-gray-50 text-[13px]"
                >
                  이름 변경
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSession(target.id)}
                  className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 text-[13px]"
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })()}

      {/* ▼ 옵션 레이어팝업 (헤더 아래) */}
      <Popover
        open={settingsOpen}
        anchorEl={settingsAnchor}
        onClose={onCloseSettings}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 520, p: 2 } } }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          옵션
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            System Prompt
          </Typography>
          <TextField
            multiline
            minRows={5}
            value={editingPrompt}
            onChange={(e: any) => setEditingPrompt(e.target.value)}
            fullWidth
            placeholder="시스템 프롬프트를 입력하세요"
          />
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{ pt: 1 }}
          >
            <Button size="small" onClick={resetToDefault}>
              기본값
            </Button>
            <Button size="small" onClick={onCloseSettings}>
              취소
            </Button>
            <Button size="small" variant="contained" onClick={applySettings}>
              적용
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </div>
  );
}
