// app/(content-header)/chatbot/components/ChatContainer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

import ScenarioEmulator from "../components/emulator/ScenarioEmulator";
// import ScenarioEmulator from "./ScenarioEmulator"; // as-is
import { useChatOrchestrator } from "../hooks/useChatOrchestrator";

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
    syncReady,
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
  // 지금 패널에 연결된 runId
  const [currentScenarioRunId, setCurrentScenarioRunId] = useState<string | null>(null);
  // 현재 패널에 연결된 시나리오 메시지 & 상태
  const currentScenarioMessage = currentScenarioRunId
    ? messages.find((m) => m.id === currentScenarioRunId)
    : undefined;

  const currentScenarioStatus = currentScenarioMessage?.scenarioStatus;

  // ▶ 시나리오 패널 열림 여부
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // 메시지가 추가되면 스크롤을 맨 아래로 이동
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 실행 결과 수신 함수
  const handleScenarioHistoryAppend = ({
    scenarioKey,
    scenarioTitle,
    steps,
    runId,
  }: {
    scenarioKey: string;
    scenarioTitle?: string;
    steps: ScenarioStep[];
    runId?: string;
  }) => {
    const now = new Date().toISOString();

    // steps를 요약해서 content에 보여줄 문자열로 만들기 (간단 버전)
    const summaryText =
      steps
        .map((s) => (s.role === "bot" ? `봇: ${s.text}` : `사용자: ${s.text}`))
        .join("\n")
        .slice(0, 500) + (steps.length > 0 ? "..." : "");

    const base: Partial<ChatMessage> = {
      role: "assistant",
      content:
        `🔁 시나리오 실행: ${scenarioTitle || scenarioKey}\n\n` + summaryText,
      createdAt: now,
      kind: "scenario",
      scenarioKey,
      scenarioTitle,
      scenarioSteps: steps,
      scenarioStatus: "done", // 완료 표시
    };

    // 이미 존재하는 시나리오 메시지가 있으면 거기에 덮어쓰기
    if (runId && activeSessionId) {
      patchMessage(activeSessionId, runId, (prev) => ({
        ...prev,
        ...base,
        id: prev.id, // id는 유지
      }));
      return;
    }

    // 🔙 runId 없는 경우(구버전/예외)엔 기존처럼 새 메시지 생성
    const scenarioMessage: ChatMessage = {
      ...(base as ChatMessage),
      id: `scenario-${scenarioKey}-${Date.now()}`,
    };

    addMessageToActive(scenarioMessage);
  };

  // 시나리오 재시작 시 메시지 상태도 함께 초기화
  const handleScenarioResetRun = (runId: string) => {
    if (!activeSessionId) return;

    patchMessage(activeSessionId, runId, (prev) => ({
      ...prev,
      // 실행 내역은 싹 비우고
      scenarioSteps: [],
      // 상태를 명시적으로 다시 "진행중" 으로
      scenarioStatus: "running",
      // 원한다면 content 도 재설정 가능
      content:
        prev.scenarioTitle || prev.scenarioKey
          ? `시나리오 실행을 시작합니다: ${prev.scenarioTitle || prev.scenarioKey}`
          : prev.content,
    }));
  };

  const handleScenarioProgress = useCallback(({
    runId,
    steps,
    finished,
    currentNodeId,
    slotValues,
    formValues,
    resetting,
  }: {
    runId: string;
    steps: ScenarioStep[];
    finished: boolean;
    slotValues: any;
    formValues: any;
    currentNodeId: string | null;
    resetting?: boolean;
  }) => {
    if (!activeSessionId) return;

    patchMessage(activeSessionId, runId, (prev) => {
      const prevState: any = (prev as any).scenarioRunState ?? null;

      // “초기화성” progress 방지:
      // currentNodeId가 없고 slot/form이 비어있으면 => 기존 값을 유지
      const incomingEmpty =
        !currentNodeId &&
        (!slotValues || Object.keys(slotValues).length === 0) &&
        (!formValues || Object.keys(formValues).length === 0);

      // 초기화(reset) 이벤트면 방어 로직을 무시하고 바로 덮어쓴다
      const shouldKeepPrevState = !resetting && incomingEmpty;

      return {
        ...prev,

        // 빈 steps로 덮어쓰지 않기
        scenarioSteps: steps.length > 0 ? steps : prev.scenarioSteps ?? [],

        // 한번 done이면 다시 running 으로 돌아가지 않게
        scenarioStatus: finished
          ? "done"
          : prev.scenarioStatus === "done"
          ? "done"
          : "running",

        scenarioRunState: {
          scenarioKey: prev.scenarioKey ?? "",
          scenarioTitle: prev.scenarioTitle,

          // 빈 값이 들어오면 기존 값을 유지해서 덮어쓰기 방지
          currentNodeId: shouldKeepPrevState
            ? (prevState?.currentNodeId ?? currentNodeId)
            : currentNodeId,

          slotValues: shouldKeepPrevState
            ? (prevState?.slotValues ?? slotValues)
            : slotValues,

          formValues: shouldKeepPrevState
            ? (prevState?.formValues ?? formValues)
            : formValues,

          finished,
        },
      };
    });
  }, [activeSessionId, patchMessage]);

  // 1) 새 실행 (shortcut 메뉴에서만 사용)
  const startNewScenarioRun = ({ scenarioKey, scenarioTitle }: {
    scenarioKey: string;
    scenarioTitle: string;
  }) => {
    const now = new Date().toISOString();
    const runId = `scenario-${scenarioKey}-${Date.now()}`;

    const scenarioMessage: ChatMessage = {
      id: runId,
      role: "assistant",
      content: `시나리오 실행을 시작합니다: ${scenarioTitle}`,
      createdAt: now,
      kind: "scenario",
      scenarioKey,
      scenarioTitle,
      scenarioSteps: [],
      scenarioStatus: "running",
    };
    addMessageToActive(scenarioMessage);
    setCurrentScenarioRunId(runId);

    setScenarioData({
      title: scenarioTitle,
      content: (
        <ScenarioEmulator
          key={runId}
          scenarioKey={scenarioKey}
          scenarioTitle={scenarioTitle}
          scenarioRunId={runId}
          onHistoryAppend={handleScenarioHistoryAppend}
          onProgress={handleScenarioProgress}
          // 재시작 시 메시지도 함께 초기화
          onResetRun={handleScenarioResetRun}
        />
      ),
    });
    setScenarioOpen(true);
  };

  // 2) 기존 실행 보기 (채팅 버블 버튼에서 사용)
  const openExistingScenarioRun = ({
    scenarioKey,
    scenarioTitle,
    runId,
    initialSteps,
    initialFinished,
  }: {
    scenarioKey: string;
    scenarioTitle?: string;
    runId: string;
    initialSteps?: ScenarioStep[];
    initialFinished?: boolean;
  }) => {
    setCurrentScenarioRunId(runId);

    const runState = messages.find(m => m.id === runId)?.scenarioRunState;

    // 여기서는 상태를 "running" 으로 바꾸거나 clear 하지 않는다
    setScenarioData({
      title: scenarioTitle || "시나리오 실행",
      content: (
        <ScenarioEmulator
          key={runId}
          scenarioKey={scenarioKey}
          scenarioTitle={scenarioTitle}
          scenarioRunId={runId}
          onHistoryAppend={handleScenarioHistoryAppend}
          onProgress={handleScenarioProgress}
          // 메시지에 저장된 실행 로그를 그대로 넘겨줌
          initialSteps={initialSteps}
          initialFinished={initialFinished}

          initialCurrentNodeId={runState?.currentNodeId ?? null}
          initialSlotValues={runState?.slotValues ?? {}}
          initialFormValues={runState?.formValues ?? {}}
          // 재시작 시 메시지 상태 강제 리셋
          onResetRun={handleScenarioResetRun}
        />
      ),
    });
    setScenarioOpen(true);
  };

  useEffect(() => {
    if (!activeSessionId || activeSessionId === "" || activeSessionId == null) {
      setIsSending(true);
    } else {
      setIsSending(false);
      // 시나리오 에뮬 패널 닫기
      setScenarioOpen(false);
    }
  }, [activeSessionId]);

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
        "새 채팅을 시작했습니다. 아래에 메시지를 입력해 보세요.",
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

  // =================================================================================
  // 지식관리 + (fallback) Gemini 스트림
  const textareaFocus = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const ensureSession = useCallback(() => {
    let sid = activeSessionId;

    if (!sid) {
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: "새 채팅을 시작했습니다. 시나리오에 맞게 메시지를 입력해 보세요.",
        createdAt: new Date().toISOString(),
      };

      sid = createSession("새 채팅", [welcomeMsg]);
      setActiveSession(sid); // createSession 직후 꼬임 방지
    }
    return sid!;
  }, [activeSessionId, createSession, setActiveSession]);

  const addMessage = useCallback((m: ChatMessage) => {
    // ensureSession()이 먼저 activeSession을 보장/세팅하므로
    // 기존 addMessageToActive 그대로 사용 가능
    addMessageToActive(m);
  }, [addMessageToActive]);

  const { send } = useChatOrchestrator({
    systemPrompt,
    textareaFocus,

    ensureSession,
    addMessage,
    patchMessage,

    onScenarioSuggest: ({ sessionId, assistantId, ans }) => {
      const scenarioKey = String(ans?.scenario?.scenarioKey ?? "");
      const scenarioTitle = String(ans?.scenario?.scenarioTitle ?? "");

      patchMessage(sessionId, assistantId, (prev) => ({
        ...prev,
        kind: "scenario",
        scenarioKey,
        scenarioTitle,
        scenarioSteps: [],
        scenarioStatus: "linked_suggest",
        content:
          ans?.scenario?.confirmMessage ||
          `[${scenarioTitle || scenarioKey}]을 실행 하시겠습니까?`,
      }));
    },
  });
  // =================================================================================

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
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      좌측에서 “새 채팅”을 눌러 대화를 시작하세요.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {sessions.map((s) => {
                        const isEditing = editingSessionId === s.id;
                        const lastMessage =
                          s.lastMessagePreview ??
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
                  onScenarioClick={(scenarioKey, scenarioTitle, messageId) => {
                    if (!scenarioKey || !messageId) return;

                    // 같은 messageId = 같은 runId 로 시나리오 패널 오픈
                    openExistingScenarioRun({
                      scenarioKey,
                      scenarioTitle: scenarioTitle || "시나리오 실행",
                      runId: messageId ?? "",
                      // 완료/진행중 상관없이, DB에 저장된 로그를 전부 초기값으로 넘김
                      initialSteps: m.scenarioSteps ?? [],
                      initialFinished: m.scenarioStatus === "done",
                    });
                  }}
                  onScenarioAccept={(messageId, scenarioKey, scenarioTitle) => {
                    if (!activeSessionId) return;

                    // 연계 메시지: 예 → 완료
                    patchMessage(activeSessionId, messageId, (prev) => ({
                      ...prev,
                      scenarioStatus: "linked_done",
                      content: `시나리오 연계를 완료했습니다.`,
                    }));

                    // 실행은 별도의 실행 메시지 생성(기존 startNewScenarioRun)
                    startNewScenarioRun({
                      scenarioKey,
                      scenarioTitle: scenarioTitle || scenarioKey,
                    });
                  }}
                  onScenarioReject={(messageId: any) => {
                    if (!activeSessionId) return;
                    // 연계 메시지: 아니오 → (요구사항)도 완료 처리
                    patchMessage(activeSessionId, messageId, (prev) => ({
                      ...prev,
                      scenarioStatus: "linked_done",
                      content: `시나리오 연계를 완료했습니다.`,
                    }));
                  }}
                />
              ))
            )}
            
            {/* ▼ 스크롤 anchor */}
            <div ref={messagesEndRef} />
            <div className="h-[10px]" />
          </div>
        </main>

        {/* shortcut 메뉴 패널 */}
        <ScenarioMenuPanel
          isPanelOpen={activeSessionId ? true : false}
          onSelectPreset={(preset) => {
            const key = preset.scenarioKey ?? "";
            if (!key) return;

            startNewScenarioRun({
              scenarioKey: key,
              scenarioTitle: preset.primary,
            });
          }}
        />

        <ChatInput
          disabled={isSending}
          onSend={send}
          textareaRef={textareaRef}
        />
      </div>

      {/* 우측 시나리오 패널 */}
      <ScenarioPanel
        open={scenarioOpen}
        scenarioTitle={scenarioData.title}
        nodeContent={scenarioData.content}
        status={currentScenarioStatus}
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
