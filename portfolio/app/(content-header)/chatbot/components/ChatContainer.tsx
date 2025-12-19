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

import ScenarioEmulator from "./ScenarioEmulator";
import { sleep } from "../utils";

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
      scenarioStatus: "done", // ✅ 완료 표시
    };

    // ✅ 이미 존재하는 시나리오 메시지가 있으면 거기에 덮어쓰기
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

  // 
  const handleScenarioProgress = useCallback(
    ({
      runId,
      steps,
      finished,
    }: {
      runId: string;
      steps: ScenarioStep[];
      finished: boolean;
    }) => {
      if (!activeSessionId) return;

      patchMessage(activeSessionId, runId, (prev) => ({
        ...prev,
        // 빈 steps로 덮어쓰지 않기
        scenarioSteps: steps.length > 0 ? steps : prev.scenarioSteps ?? [],
        // 한번 done이면 다시 running 으로 돌아가지 않게
        scenarioStatus: finished
          ? "done"
          : prev.scenarioStatus === "done"
          ? "done"
          : "running",
      }));
    },
    [activeSessionId, patchMessage],
  );


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
          // 재시작 시 메시지 상태 강제 리셋
          onResetRun={handleScenarioResetRun}
        />
      ),
    });
    setScenarioOpen(true);
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

  function getGeminiPrefix(ans: any) {
    const intentsCount = Number(ans?.debug?.intentsCount ?? 0);
    const hasAnyIntent = intentsCount > 0;
    const matchedIntent = ans?.intent != null;

    // A) 인텐트 자체가 없음(설정/데이터 문제)
    if (!hasAnyIntent) {
      return "지식 데이터(인텐트)가 아직 준비되지 않았습니다.\n일반 답변으로 진행합니다.\n\n";
    }

    // B) 인텐트는 있는데 매칭 실패(진짜 fallback)
    if (!matchedIntent) {
      return "등록된 의도에 해당하는 답변을 찾지 못해 일반 답변으로 진행합니다.\n\n";
    }

    // C) 인텐트는 매칭됐는데 answer/scenario가 비어있음
    const hasAnswer = Boolean(ans?.answer);
    const hasScenario = Boolean(ans?.scenario?.scenarioKey);
    if (!hasAnswer && !hasScenario) {
      return "해당 의도에 연결된 답변/시나리오가 아직 없습니다.\n일반 답변으로 진행합니다.\n\n";
    }

    return ""; // 굳이 안내 필요 없으면 빈 문자열
  }

  // 지식관리 + (fallback) Gemini 스트림
  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: "새 채팅을 시작했습니다. 시나리오에 맞게 메시지를 입력해 보세요.",
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

    // ✅ fallback UI 제어용
    const fallbackPrefixDefault = "";
    let showFallbackLoading = false;
    let fallbackPrefixRef = fallbackPrefixDefault;

    // ✅ 1) 지식관리 answer 먼저 호출
    try {
      const backend = (process.env.NEXT_PUBLIC_BACKEND || "firebase").toLowerCase();
      const answerUrl =
        backend === "postgres"
          ? "/api/chatbot/postgres/answer"
          : "/api/chatbot/firebase/answer";

      const projectId =
        process.env.NEXT_PUBLIC_KNOWLEDGE_PROJECT_ID ||
        "81ba67f6-7568-446a-a82e-d0d7473ce437";

      if (projectId) {
        const ansRes = await fetch(answerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            text,
            locale: "ko",
          }),
        });

        if (ansRes.ok) {
          const ans = await ansRes.json();

          // ✅ 서버 응답 스펙에 맞춘 fallback 판별 (핵심)
          // - 서버가 { fallback: boolean } 필드를 내려주고 있음
          // - intent가 null이면 사실상 fallback 상황이므로 UI를 켠다
          const isFallback =
            Boolean(ans?.fallback) ||
            Boolean(ans?.isFallback) ||
            Boolean(ans?.intent?.isFallback) ||
            ans?.intent == null;

          const scenarioKey = String(ans?.scenario?.scenarioKey ?? "");
          const scenarioTitle = String(ans?.scenario?.scenarioTitle ?? "");
          const hasScenario = Boolean(scenarioKey);

          console.log("[answer]", {
            intent: ans?.intent,
            fallback: ans?.fallback,
            isFallback,
            scenarioKey,
            hasScenario,
          });

          // 1) 시나리오 연결된 인텐트면: "suggest" 메시지로 만들고 종료
          if (!isFallback && hasScenario) {
            patchMessage(currentSessionId!, assistantId, (prev) => ({
              ...prev,
              kind: "scenario",
              scenarioKey,
              scenarioTitle,
              scenarioSteps: [],
              scenarioStatus: "linked_suggest",
              content:
                ans?.scenario?.confirmMessage ||
                `[${scenarioTitle}]을 실행 하시겠습니까?`,
            }));
            setIsSending(false);
            textareaRef.current?.focus();
            return;
          }

          // 2) fallback이면: 안내 + dots 먼저 표시하고, Gemini로 계속 진행
          if (isFallback) {
            const prefix = getGeminiPrefix(ans);
            showFallbackLoading = true;
            fallbackPrefixRef = prefix || "일반 답변으로 진행합니다.\n\n";

            patchMessage(currentSessionId!, assistantId, (prev: any) => ({
              ...prev,
              kind: "llm",
              content: fallbackPrefixRef, // prefix 먼저 보여줌(유지)
              meta: { ...(prev?.meta ?? {}), loading: true },
            }));
          } else {
            // 3) fallback이 아니고 지식 답변이 있으면: 일반 텍스트로 종료
            if (ans?.answer) {
              patchMessage(currentSessionId!, assistantId, (prev) => ({
                ...prev,
                kind: "llm",
                content: ans.answer,
                meta: { ...(prev as any)?.meta, loading: false },
              }));
              setIsSending(false);
              textareaRef.current?.focus();
              return;
            }
            // 4) intent는 있는데 answer가 null인 경우: 정책상 Gemini로 보낼지 말지 선택 가능
            //    -> 여기서는 Gemini로 진행 (그냥 계속 아래로 내려감)
          }
        }
      }
    } catch (err) {
      console.error("Knowledge answer error:", err);
      // 지식관리 실패해도 Gemini로 진행
    }

    // ✅ 2) Gemini 스트림 (fallback일 경우 첫 chunk에서 dots만 끄고 답변 붙임)
    try {
      const res = await fetch("/api/chat/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          systemPrompt,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Gemini HTTP ${res.status} ${msg}`);
      }

      // ✅ fallback UI가 "보이도록" 아주 짧게만 대기 (필수는 아니지만 UX 안정)
      if (showFallbackLoading) {
        await sleep(300);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let started = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunk = decoder.decode(value || new Uint8Array(), {
          stream: !done,
        });
        if (!chunk) continue;

        // ✅ 첫 chunk에서 loading만 끄고, prefix는 유지한 채 chunk를 붙인다
        if (!started) {
          started = true;

          if (showFallbackLoading) {
            patchMessage(currentSessionId!, assistantId, (prev: any) => ({
              ...prev,
              kind: "llm",
              content: (fallbackPrefixRef ?? "") + chunk,
              meta: { ...(prev?.meta ?? {}), loading: false }, // ✅ dots OFF
            }));
            continue;
          }
        }

        patchMessage(currentSessionId!, assistantId, (prev) => ({
          ...prev,
          content: (prev.content ?? "") + chunk,
        }));
      }

      // ✅ 스트림이 "아무 chunk도 못 받고" 끝났으면 loading 끄기(안전장치)
      if (showFallbackLoading && !started) {
        patchMessage(currentSessionId!, assistantId, (prev: any) => ({
          ...prev,
          meta: { ...(prev?.meta ?? {}), loading: false },
        }));
      }
    } catch (err) {
      console.error("Gemini chat error:", err);
      patchMessage(currentSessionId!, assistantId, (prev: any) => ({
        ...prev,
        meta: { ...(prev?.meta ?? {}), loading: false },
        content: "⚠️ 답변 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      }));
    } finally {
      // ✅ 혹시 남아있으면 무조건 끔
      if (showFallbackLoading) {
        patchMessage(currentSessionId!, assistantId, (prev: any) => ({
          ...prev,
          meta: { ...(prev?.meta ?? {}), loading: false },
        }));
      }
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
          onSend={handleSend}
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
