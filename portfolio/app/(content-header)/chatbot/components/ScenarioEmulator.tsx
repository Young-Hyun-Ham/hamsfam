// app/(content-header)/chatbot/components/ScenarioEmulator.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store";
import * as builderBackendService from "../../builder/services/backendService";
import ScenarioNodeControls from "./ScenarioNodeControls";
import { makeStepId, resolveTemplate } from "../utils";
import useChatbotStore from "../store";
import { AnyEdge, AnyNode, ChatStep } from "../types";
import { useEngineLogger } from "../utils/engine";

// 루트 노드 찾기
function findRootNode(nodes: AnyNode[], edges: AnyEdge[]): AnyNode | null {
  const targets = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targets.has(n.id)) ?? null;
}

// 다음 노드 찾기
function findNextNode(
  nodes: AnyNode[],
  edges: AnyEdge[],
  currentId: string,
  handle?: string | null
): AnyNode | null {
  const candidates = edges.filter((e) => e.source === currentId);
  if (!candidates.length) return null;

  if (handle) {
    const matched = candidates.find((e) => e.sourceHandle === handle);
    if (matched) {
      return nodes.find((n) => n.id === matched.target) ?? null;
    }
  }

  const first = candidates[0];
  return nodes.find((n) => n.id === first.target) ?? null;
}

type ScenarioEmulatorProps = {
  scenarioKey: string;
  scenarioTitle?: string;
  onHistoryAppend?: (payload: {
    scenarioKey: string;
    scenarioTitle?: string;
    steps: ChatStep[];
    runId?: string;
  }) => void;

  // 어떤 실행/채팅 메시지와 연결된 에뮬레이터인지 구분하는 key
  scenarioRunId: string;
  // 진행 상황을 채팅으로 올려보내기 위한 콜백 추가
  onProgress?: (payload: {
    runId: string;
    steps: ChatStep[];
    finished: boolean;
    currentNodeId: string | null;
    slotValues: Record<string, any>;
    formValues: Record<string, any>;
    resetting?: boolean;
  }) => void;

  // 재시작(초기화) 시 부모에게 알려줄 콜백
  onResetRun?: (runId: string) => void;
  // 메시지에 저장된 실행 로그를 초기값으로 받기
  initialSteps?: ChatStep[];
  initialFinished?: boolean;
  initialCurrentNodeId?: string | null;
  initialSlotValues?: Record<string, any>;
  initialFormValues?: Record<string, any>;
};

export default function ScenarioEmulator({
  scenarioKey,
  scenarioTitle,
  scenarioRunId,
  onHistoryAppend,
  onProgress,
  onResetRun, 
  initialSteps,
  initialFinished,
  initialCurrentNodeId,
  initialSlotValues,
  initialFormValues,
}: ScenarioEmulatorProps) {
  const user = useStore((s: any) => s.user);
  const backend = useStore((s: any) => s.backend);

  const [nodes, setNodes] = useState<AnyNode[]>([]);
  const [edges, setEdges] = useState<AnyEdge[]>([]);
  const historyPushedRef = useRef(false);
  const [llmDone, setLlmDone] = useState(false); // llm 완료 상태

  const persistedRun = useChatbotStore((s) =>
    scenarioRunId ? s.scenarioRuns[scenarioRunId] : undefined,
  );
  const saveScenarioRun = useChatbotStore((s) => s.saveScenarioRun);
  const clearScenarioRun = useChatbotStore((s) => s.clearScenarioRun);

  useEffect(() => {
    const fetchScenarioData = async (key: string) => {
      const data = await builderBackendService.fetchScenarioData(backend, {
        scenarioId: key,
      });
      setNodes(data.nodes);
      setEdges(data.edges);
    };
    fetchScenarioData(scenarioKey);
  }, [backend, scenarioKey]);

  const rootNode = useMemo(() => findRootNode(nodes, edges), [nodes, edges]);

  // 초기값을 props 에서 받아서 시작
  const [currentNode, setCurrentNode] = useState<AnyNode | null>(null);
  const [steps, setSteps] = useState<ChatStep[]>(initialSteps ?? []);
  const [formValues, setFormValues] = useState<Record<string, any>>(initialFormValues ?? {});
  const [slotValues, setSlotValues] = useState<Record<string, any>>(initialSlotValues ?? {});
  const [finished, setFinished] = useState(initialFinished ?? false);

  // 한 번만 store 에서 복원했는지 여부
  const [hydratedFromStore, setHydratedFromStore] = useState(false);

  const hydratedRef = useRef(false);
  const initNodeRef = useRef(false);

  // nodes 로딩 후 initialCurrentNodeId 적용
  useEffect(() => {
    if (!nodes?.length) return;
    if (initNodeRef.current) return;

    // ✅ 복원 우선순위: persistedRun > props(initial) > root
    const restoreNodeId =
      persistedRun?.currentNodeId ??
      initialCurrentNodeId ??
      null;

    if (restoreNodeId) {
      const found = nodes.find((n) => n.id === restoreNodeId);
      setCurrentNode(found ?? rootNode);
    } else {
      setCurrentNode(rootNode);
    }

    // slot/form도 여기서 “최초 1회”만 세팅
    if (persistedRun) {
      setSlotValues(persistedRun.slotValues ?? {});
      setFormValues(persistedRun.formValues ?? {});
    } else {
      setSlotValues(initialSlotValues ?? {});
      setFormValues(initialFormValues ?? {});
    }

    hydratedRef.current = true;
    initNodeRef.current = true;
    setHydratedFromStore(true); // persistedRun 복원 케이스도 hydration 완료로 처리
  }, [
    nodes?.length,
    rootNode,
    persistedRun,
    initialCurrentNodeId,
    initialSlotValues,
    initialFormValues,
  ]);

  // ==============================================================================
  // 엔진 관련
  // console.log("userinfo =====> ", user);
  const userId = user?.uid ?? user?.id ?? user?.sub ?? "guest";
  const engineProps = { nodes, edges, scenarioKey, scenarioRunId, userId };
  const { logToEngine, resetEngineState } = useEngineLogger();
  useEffect(() => {
    if (!scenarioRunId) return;
    if (!nodes.length || !edges.length) return;

    // run 시작 시점에 엔진 상태 초기화
    resetEngineState();
    logToEngine({ text: "" }, engineProps, );
  }, [scenarioRunId, nodes.length, edges.length]);

  // =============================================================================

  // persistedRun이 없을 때, ChatContainer에서 준 initial 상태로 복원
  useEffect(() => {
    if (!scenarioRunId) return;
    if (hydratedFromStore) return;
    if (persistedRun) return;              // store가 있으면 store 우선
    if (!nodes || !nodes.length) return;   // 노드 로딩 전이면 대기

    // initialSteps는 이미 useState 초기값으로 들어가도 되지만,
    // 재오픈 시 확실히 맞추려면 여기서도 세팅해도 됨
    if (initialSteps) setSteps(initialSteps);
    if (typeof initialFinished === "boolean") setFinished(initialFinished);

    setFormValues(initialFormValues ?? {});
    setSlotValues(initialSlotValues ?? {});

    const id = initialCurrentNodeId ?? null;
    if (id) {
      const found = nodes.find((n) => n.id === id);
      setCurrentNode(found ?? rootNode);
    } else {
      // currentNodeId가 없으면 root로(정상)
      setCurrentNode(rootNode);
    }

    setHydratedFromStore(true);
  }, [
    scenarioRunId,
    hydratedFromStore,
    persistedRun,
    nodes,
    rootNode,
    initialSteps,
    initialFinished,
    initialCurrentNodeId,
    initialSlotValues,
    initialFormValues,
  ]);

  const lastProgressRef = useRef<{
    stepsLen: number;
    finished: boolean;
  } | null>(null);

  useEffect(() => {
    if (!scenarioRunId || !onProgress) return;

    // resetScenario()가 수동으로 onProgress를 쏜 직후에는 자동 progress 저장을 1회 막는다
    if (resetInFlightRef.current) return;

    // mount 시 빈값 덮어쓰기 방지
    if (!hydratedRef.current) return;

    // currentNode가 없으면 보내지 않음
    const nodeId = currentNode?.id ?? null;
    if (!nodeId) return;

    // “아무 진행도 없는 첫 마운트”에서 빈 slot/form으로 덮어쓰기 방지
    // (여기 조건은 상황에 맞게 조정 가능)
    const hasAnyStep = (steps?.length ?? 0) > 0;
    const hasAnyState =
      (Object.keys(slotValues ?? {}).length > 0) ||
      (Object.keys(formValues ?? {}).length > 0);

    // steps도 없고 slot/form도 비었으면 => 이건 저장할 가치가 없는 초기 상태
    if (!hasAnyStep && !hasAnyState && !persistedRun) return;

    // 현재 slotValues 기준으로 steps를 "치환본"으로 만든다
    const resolvedSteps: ChatStep[] = steps.map((s) => ({
      ...s,
      text: resolveTemplate(s.text, slotValues),
    }));

    onProgress({
      runId: scenarioRunId,
      steps: resolvedSteps,
      finished,
      currentNodeId: currentNode?.id ?? null,
      slotValues,
      formValues,
    });
  }, [
    scenarioRunId,
    steps.length,
    finished,
    onProgress,
    persistedRun,
    hydratedFromStore,
    slotValues,
  ]);
  
  useEffect(() => {
    if (!scenarioRunId) return;

    // 이미 저장된 실행 기록(persistedRun)이 있는데
    // 아직 그걸로 복원(hydratedFromStore)하기 전이면
    // 여기서 saveScenarioRun 을 하면 "빈 초기값"으로 덮어써버리므로, 그냥 리턴
    if (persistedRun && !hydratedFromStore) {
      return;
    }

    const resolvedSteps: ChatStep[] = steps.map((s) => ({
      ...s,
      text: resolveTemplate(s.text, slotValues),
    }));
    
    // 새 실행(run) 이거나, 이미 복원한 후에는 정상적으로 저장
    saveScenarioRun(scenarioRunId, {
      scenarioKey,
      scenarioTitle,
      steps: resolvedSteps,
      formValues,
      slotValues,
      currentNodeId: currentNode?.id ?? null,
      finished,
    });
  }, [
    scenarioRunId,
    scenarioKey,
    scenarioTitle,
    steps,
    formValues,
    slotValues,
    currentNode,
    finished,
    saveScenarioRun,
    hydratedFromStore,
  ]);

  const resetInFlightRef = useRef(false);
  function resetScenario() {
    resetInFlightRef.current = true;

    setCurrentNode(rootNode);
    setSteps([]);
    setFormValues({});
    setSlotValues({});
    setFinished(false);
    historyPushedRef.current = false;

    if (scenarioRunId) {
      clearScenarioRun(scenarioRunId);
    }
    
    // ChatContainer에 "이건 reset이야"라고 알려서
    // handleScenarioProgress의 빈값 방어 로직을 우회하게 만든다.
    if (scenarioRunId && onProgress) {
      onProgress({
        runId: scenarioRunId,
        steps: [],
        finished: false,
        currentNodeId: rootNode?.id ?? null,  // null 말고 root id를 보내는 게 핵심
        slotValues: {},
        formValues: {},
        resetting: true,
      });
    }

    // 부모(ChatContainer)에게 "이 runId 다시 시작했어" 알려주기
    if (onResetRun) {
      onResetRun(scenarioRunId);
    }

    // 다음 tick에서 자동 progress 다시 허용
    queueMicrotask(() => {
      resetInFlightRef.current = false;
    });
  }

  // 끝났을 때 한 번만 부모에게 실행 결과 전달
  useEffect(() => {
    if (!finished) return;
    if (!steps.length) return;
    if (!onHistoryAppend) return;
    if (historyPushedRef.current) return;

    historyPushedRef.current = true;
    
    // 현재 시점의 slotValues 스냅샷
    const slotSnapshot = slotValues;

    // 각 step의 text 에 {{key}} -> slotValues[key] 치환
    const resolvedSteps: ChatStep[] = steps.map((s) => ({
      ...s,
      text: resolveTemplate(s.text, slotSnapshot),
    }));
    
    onHistoryAppend({
      scenarioKey,
      scenarioTitle,
      steps: resolvedSteps,
      runId: scenarioRunId,
    });
  }, [finished, steps, onHistoryAppend, scenarioKey, scenarioTitle, scenarioRunId, slotValues]);

  useEffect(() => {
    if (!currentNode) return;
    if (finished) return;
    let cancelled = false;

    // 1) API 노드 자동 실행
    if (currentNode.type === "api") {
      (async () => {
        const ok = await runApiNode(currentNode);
        if (cancelled) return;

        const next = findNextNode(nodes, edges, currentNode.id, "onSuccess");
        if (!next) {
          setFinished(true);
          return;
        }
        setCurrentNode(next);

        if (next.type === "message") {
          setSteps(prev => [
            ...prev,
            { id: next.id, role: "bot", text: next.data?.content ?? "" },
          ]);
        }
      })();
    }

    // 2) setSlot 노드 자동 실행
    if (currentNode.type === "setSlot") {
      runSetSlotNode(currentNode);
      const next = findNextNode(nodes, edges, currentNode.id);
      if (!next) {
        setFinished(true);
      } else {
        setCurrentNode(next);

        if (next.type === "message") {
          setSteps(prev => [
            ...prev,
            { id: next.id, role: "bot", text: next.data?.content ?? "" },
          ]);
        }
      }
    }

    // 3) LLM 노드 자동 실행
    if (currentNode.type === "llm") {
      // 이 시점의 slotValues 스냅샷 (프롬프트 템플릿용)
      const slotSnapshot = slotValues;
      setLlmDone(false);

      (async () => {
        try {
          await runLlmNode(currentNode, slotSnapshot);
        } catch (e) {
          console.error("LLM 노드 effect 오류:", e);
          if (!cancelled) {
            setLlmDone(true); // 에러여도 사용자가 계속 눌러서 흐름 진행할 수 있게
          }
        } finally {
          if (cancelled) return;
          setLlmDone(true);
        }
      })();
    }

    // 4) delay 노드 자동 실행
    if (currentNode.type === "delay") {
      const duration = Number(currentNode.data?.duration ?? 1000); // 기본 1초

      (async () => {
        await new Promise((resolve) => setTimeout(resolve, duration));

        if (cancelled) return;

        const next =
          findNextNode(nodes, edges, currentNode.id, "default") ??
          findNextNode(nodes, edges, currentNode.id, null);

        if (!next) {
          setFinished(true);
          return;
        }

        setCurrentNode(next);

        if (next.type === "message") {
          setSteps((prev) => [
            ...prev,
            {
              id: next.id,
              role: "bot",
              text: next.data?.content ?? "",
            },
          ]);
        }
      })();
    }

    // 5) slotFilling 노드: 질문을 steps에 뿌리고, 사용자의 선택/입력을 기다린다
    if (
      currentNode.type === "slotFilling" ||
      currentNode.type === "slotfilling"
    ) {
      const q = currentNode.data?.content ?? "값을 선택/입력해 주세요.";
      // 중복으로 계속 push되는 것 방지(현재 노드 id로 1번만)
      setSteps((prev) => {
        const already = prev.some((s) => s.id === makeStepId(currentNode.id));
        if (already) return prev;
        return [...prev, { id: makeStepId(currentNode.id), role: "bot", text: q }];
      });
    }

    return () => {
      cancelled = true;
    };
  }, [currentNode, nodes, edges]);

  // ==============================================================================
  // 실행기 메소드 모음 start
  // ==============================================================================
  // 🔍 form 엘리먼트(type: "search") 전용 API 실행 함수
  async function runSearchElement(el: any) {
    if (!el || el.type !== "search") return;

    const apiCfg = el.apiConfig;
    if (!apiCfg || !apiCfg.url) return;

    const value = formValues[el.name];
    // 입력값이 없으면 검색 안 함
    if (value === undefined || value === null || value === "") return;

    // headers 파싱
    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = apiCfg.headers ? JSON.parse(apiCfg.headers) : {};
    } catch (e) {
      console.error("[search] header JSON parsing error:", e);
    }

    const method: string = apiCfg.method || "GET";

    // 템플릿 치환에 사용할 컨텍스트:
    // - value: 현재 search 입력값
    // - formValues: 같은 폼의 다른 값들
    // - slotValues: 기존 슬롯 값들
    const ctx = {
      value,
      ...formValues,
      ...slotValues,
    };

    // URL 템플릿 치환 (예: {{search_term}})
    const url = resolveTemplate(apiCfg.url, ctx);

    // body 템플릿 치환 (예: {"query":"{{value}}"})
    let body: string | undefined = undefined;
    if (apiCfg.bodyTemplate) {
      body = resolveTemplate(apiCfg.bodyTemplate, ctx);
    }

    try {
      const res = await fetch(url, {
        method,
        headers: parsedHeaders,
        ...(method.toUpperCase() !== "GET" && body ? { body } : {}),
      });

      const json = await res.json();

      if (el.resultSlot) {
        // 🔹 검색 결과를 지정된 슬롯에 그대로 넣어둔다.
        //   (grid에서 사용하거나, 메시지 템플릿에서 그대로 참조할 수 있게)
        setSlotValues((prev) => ({
          ...prev,
          [el.resultSlot]: json,
        }));
      }

      return json;
    } catch (err) {
      console.error("[search] API 실행 오류:", err);
      return null;
    }
  }


  // setSlot 노드 실행 함수
  function runSetSlotNode(node: AnyNode) {
    const assignments: any[] = node.data?.assignments ?? [];

    if (!assignments.length) return;

    setSlotValues(prev => {
      const next = { ...prev };

      for (const a of assignments) {
        if (!a) continue;

        // 신규 포맷: { key, value } 만 있는 경우
        if (a.key && a.value !== undefined && !a.slot && !a.from) {
          next[a.key] = a.value;
          continue;
        }

        // 기존 포맷: { slot, from, key, value }
        if (!a.slot) continue;

        // 1) 고정 문자열
        if (a.from === "literal") {
          next[a.slot] = a.value ?? "";
        }

        // 2) form 값 복사
        if (a.from === "form" && a.key) {
          next[a.slot] = formValues[a.key];
        }

        // 3) 다른 slot 값 복사
        if (a.from === "slot" && a.key) {
          next[a.slot] = prev[a.key];
        }
      }

      return next;
    });
  }

  // API 노드 실행 함수
  async function runApiNode(node: AnyNode) {
    try {
      const { url, method, headers, body, responseMapping } = node.data;

      // Header JSON 파싱
      let parsedHeaders = {};
      try {
        parsedHeaders = headers ? JSON.parse(headers) : {};
      } catch (e) {
        console.error("Header JSON parsing error:", e);
      }

      // Fetch 옵션 구성
      const options: any = { method, headers: parsedHeaders };

      if (method !== "GET" && body) {
        options.body = body;
      }

      // API 호출
      const res = await fetch(url, options);
      const json = await res.json();

      // 슬롯 매핑
      if (Array.isArray(responseMapping)) {
        setSlotValues((prev: any) => {
          const next = { ...prev };
          responseMapping.forEach((m) => {
            const path = m.path;
            const slot = m.slot;

            // json[path] 데이터를 slot 에 저장
            next[slot] = json[path];
          });
          return next;
        });
      }

      return true;
    } catch (e) {
      console.error("API 실행 오류:", e);
      return false;
    }
  }

  const systemPrompt = useChatbotStore((s: any)=> s.systemPrompt);
  // LLM 노드 실행 함수
  async function runLlmNode(
    node: AnyNode,
    slotSnapshot: Record<string, any>
  ) {
    try {
      const rawPrompt: string = node.data?.prompt ?? "";
      // {{formdatas}} 같은 템플릿 치환은 "LLM 실행 시작 시점의" slotSnapshot 기준
      const prompt = resolveTemplate(rawPrompt, slotSnapshot);

      const outputVar: string = node.data?.outputVar || "llm_output";

      const res = await fetch("/api/chat/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt,
        }),
      });

      if (!res.ok || !res.body) {
        console.error("LLM API 호출 실패:", res.status, res.statusText);
        setSteps((prev) => [
          ...prev,
          {
            id: `${node.id}-error`,
            role: "bot",
            text: `[LLM 오류] 상태 코드: ${res.status}`,
          },
        ]);
        return false;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulated = "";

      // 우선 빈 버블 하나 추가해두고, 그걸 계속 업데이트
      const stepId = makeStepId(node.id);
      setSteps((prev) => [
        ...prev,
        {
          id: stepId,
          role: "bot",
          text: "",
        },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          if (!chunkText) continue;

          accumulated += chunkText;

          // 마지막 LLM 말풍선을 누적 텍스트로 계속 갱신
          setSteps((prev) =>
            prev.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    text: accumulated,
                  }
                : s,
            ),
          );
        }
      }

      // 🔹 스트림이 전부 끝난 시점에 slotValues에 최종 결과 저장
      setSlotValues((prev) => ({
        ...prev,
        [outputVar]: accumulated,
      }));

      return true;
    } catch (e) {
      console.error("LLM 노드 실행 오류:", e);
      setSteps(prev => [
        ...prev,
        {
          id: `${node.id}-error`,
          role: "bot",
          text: "[LLM 실행 오류가 발생했습니다.]",
        },
      ]);
      return false;
    }
  }
  // ==============================================================================
  // 실행기 메소드 모음 end
  // ==============================================================================

  // ==============================================================================
  // handler 메소드 모음 start
  // ==============================================================================
  // 메세지 노드 후 대화 계속하기 핸들러
  const handleContinueFromMessage = () => {
    if (!currentNode) return;
    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNode(next);

    if (next.type === "message") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "branch") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "form") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.title
            ? `폼: ${next.data.title}`
            : "폼을 입력해 주세요.",
        },
      ]);
    } else if (next.type === "link") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "링크로 이동합니다.",
        },
      ]);
    }
  };

  // llm 노드 후 대화 계속하기 핸들러들
  const handleContinueFromLlm = () => {
    if (!currentNode) return;
    let next =
      findNextNode(nodes, edges, currentNode.id, "default") ||
      findNextNode(nodes, edges, currentNode.id, null);

    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNode(next);

    if (next.type === "message") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    }

    logToEngine({
      action: { type: "reply", value: "continue", display: "continue" },
    }, engineProps);
  };

  // branch 노드 후 분기 선택 핸들러
  const handleBranchClick = (reply: { display: string; value: string }) => {
    if (!currentNode) return;

    setSteps((prev) => [
      ...prev,
      {
        id: makeStepId(`${currentNode.id}-${reply.value}`),
        role: "user",
        text: reply.display,
      },
    ]);

    const next = findNextNode(nodes, edges, currentNode.id, reply.value);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNode(next);

    if (next.type === "message") {
      setSteps((prev) => [
        ...prev,
        {
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "form") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.title
            ? `폼: ${next.data.title}`
            : "폼을 입력해 주세요.",
        },
      ]);
    } else if (next.type === "link") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "링크로 이동합니다.",
        },
      ]);
    }

    logToEngine({
      action: { type: "reply", value: reply.value, display: reply.display },
    }, engineProps);
  };

  // 폼 노드 제출 후 핸들러
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNode) return;

    const elements: any[] = currentNode.data?.elements ?? [];
    const summaryParts: string[] = [];

    // 추가: 이 폼에 설정된 slotKey
    const formSlotKey: string | undefined = currentNode.data?.slotKey;

    // 이 폼에서 사용한 값들을 한 객체로 모으기
    const formObject: Record<string, any> = {};
    // console.log("formSlotKey ======> ", formSlotKey);
    // console.log("formObject ======> ", formObject);

    // 폼에서 grid 엘리먼트 찾기(있으면 별도 포맷)
    const gridEl = elements.find((el) => el?.type === "grid");
    const gridLabel = gridEl?.label || gridEl?.name || "Grid";

    // 보기 좋은 값 포맷 유틸
    const formatAny = (v: any): any => {
      if (v === null || v === undefined) return "";
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
      if (Array.isArray(v)) return v.map((x) => formatAny(x)).filter(Boolean).join(", ");
      try {
        return JSON.stringify(v, null, 2); // 객체는 pretty json
      } catch {
        return String(v);
      }
    };
    
    const formatSelectedRow = (row: any, displayKeys: { key: string; label: string }[]) => {
      if (!row) return "";
      // 1) displayKeys 우선
      const displayLine =
        (displayKeys ?? [])
          .map((c) => row?.[c.key])
          .filter((x) => x !== undefined && x !== null && String(x).trim() !== "")
          .join(" / ") || "";

      // 2) 없으면 id라도
      return displayLine || (row?.id ? String(row.id) : "");
    };

    // 1) summaryParts 만들면서 formObject 채우기
    for (const el of elements) {
      const value = formValues[el.name];

      if (value !== undefined && value !== null && value !== "") {
        // const label = el.label || el.name;
        // summaryParts.push(`${label}: ${value}`);
        formObject[el.name] = value;
      }

      // 🔍 type: "search" 인 엘리먼트는 여기서 API 호출
      if (el.type === "search") {
        await runSearchElement(el);
      }
      // grid 는 아래에서 한 번에 포맷할 거라 여기서는 skip
      if (el.type === "grid") continue;

      // 값이 없는 건 스킵
      if (value === undefined || value === null || value === "") continue;

      // checkbox/array 등 대응
      const label = el.label || el.name;
      summaryParts.push(`${label}: ${formatAny(value)}`);
    }

    // grid가 있다면 “New Grid 아래 블록”을 만든다
    if (gridEl) {
      const picked = formValues[gridEl.name]; // {id, ...row} 형태
      const displayKeys: { key: string; label: string }[] = gridEl.displayKeys ?? [];

      const selectedLine = picked ? formatSelectedRow(picked, displayKeys) : "";
      const gridDataJson = picked ? formatAny(picked) : "";

      const blockLines: string[] = [];
      blockLines.push(`${gridLabel}:`);
      blockLines.push(`- 선택된 행: ${selectedLine || "(선택 없음)"}`);
      // if (picked) {
      //   blockLines.push(`- 그리드 데이터:\n${gridDataJson}`);
      // }

      // 다른 입력값들도 “New Grid 아래에” 붙이고 싶으면 같이 넣기
      // (현재 summaryParts에 담긴 것들을 block으로 합쳐버림)
      if (summaryParts.length > 0) {
        blockLines.push(`- 입력값:`);
        summaryParts.forEach((line) => blockLines.push(`  - ${line}`));
      }

      // 최종 사용자 step 텍스트는 grid 블록만 남기기
      summaryParts.length = 0;
      summaryParts.push(blockLines.join("\n"));
    }

    // 2) formSlotKey 가 있으면, 이 폼 전체 값을 하나의 slot에 저장
    if (formSlotKey) {
      const pickedRow = gridEl ? formValues[gridEl.name] : null;
      const hasPickedRow =
        pickedRow && typeof pickedRow === "object" && Object.keys(pickedRow).length > 0;

      const selectedRow = hasPickedRow ? pickedRow : null;
      const selectedRowId = selectedRow?.id ?? null;
      
      setSlotValues((prev: any) => {
        const prevFormSlot = prev?.[formSlotKey] ?? {};

        return {
          ...prev,

          // ✅ 전역 슬롯
          selectedRow,
          selectedRowId,

          // ✅ 폼 슬롯(newgriddata)
          [formSlotKey]: {
            ...prevFormSlot,
            ...formObject,     // ✅ "현재 폼에서 만든 데이터"만 저장
            selectedRow,
            selectedRowId,
          },
        };
      });
    }

    // 3) 사용자 입력 로그(step)에 기록
    setSteps((prev) => [
      ...prev,
      {
        id: makeStepId(`${currentNode.id}-form`),
        role: "user",
        text:
          summaryParts.length > 0
            ? summaryParts.join("\n")
            : "폼을 제출했습니다.",
      },
    ]);

    // 4) 다음 노드로 이동
    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNode(next);

    if (next.type === "message") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "link") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "링크로 이동합니다.",
        },
      ]);
    }

    logToEngine({
      action: { type: "reply", value: formValues, display: "form" },
    }, engineProps);
  };

  useEffect(() => {
    console.log("[slotValues updated]", slotValues);
  }, [slotValues]);

  // 링크 노드 후 대화 계속하기 핸들러
  const handleNextFromLink = () => {
    if (!currentNode) return;
    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNode(next);

    if (next.type === "message") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    }

    logToEngine({
      action: { type: "reply", value: "continue", display: "continue" },
    }, engineProps);
  };

  // iframe 노드 후 대화 계속하기 핸들러
  const handleContinueFromIframe = () => {
    if (!currentNode) return;

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNode(next);

    if (next.type === "message") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "link") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.content ?? "링크로 이동합니다.",
        },
      ]);
    } else if (next.type === "form") {
      setSteps((prev) => [
        ...prev,
        {
          id: makeStepId(next.id),
          role: "bot",
          text: next.data?.title
            ? `폼: ${next.data.title}`
            : "폼을 입력해 주세요.",
        },
      ]);
    }

    logToEngine({
      action: { type: "reply", value: "continue", display: "continue" },
    }, engineProps);
  };

  // slotFilling 노드: quick reply 클릭 시
  const handleSlotFillingClick = (reply: { display: string; value: any }) => {
    if (!currentNode) return;

    const slotName: string = currentNode.data?.slot ?? currentNode.data?.slotName ?? "";
    // 1) 유저 발화(step) 추가
    setSteps((prev) => [
      ...prev,
      // 선택한 값 user 채팅 추가
      // { id: makeStepId(`${currentNode.id}-sf-${String(reply.value)}`), role: "user", text: reply.display },
    ]);

    // 2) slotValues 저장
    if (slotName) {
      setSlotValues((prev) => ({ ...prev, [slotName]: reply.value }));
    }

    // 3) 다음 노드로 이동 (가능하면 handle=reply.value로, 아니면 default/null)
    const handle = String(reply.value);
    const next =
      findNextNode(nodes, edges, currentNode.id, handle) ||
      findNextNode(nodes, edges, currentNode.id, "default") ||
      findNextNode(nodes, edges, currentNode.id, null);

    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNode(next);

    // 4) 다음이 message면 바로 봇 step 추가
    if (next.type === "message") {
      setSteps((prev) => [...prev, { id: makeStepId(next.id), role: "bot", text: next.data?.content ?? "" }]);
    }

    logToEngine({
      action: { type: "reply", value: reply.value, display: reply.display },
    }, engineProps);
  };
  // ==============================================================================
  // handler 메소드 모음 end
  // ==============================================================================

  return (
    <div className="flex h-full flex-col rounded-xl border border-emerald-100 bg-white/80 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-700">
          시나리오 애뮬레이터
        </span>
        <button
          className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50"
          onClick={resetScenario}
        >
          초기화
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-md bg-emerald-50/40 p-2 text-xs">
        {steps.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-gray-400">
            시나리오를 시작하려면 초기화를 눌러주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((s) => {
              const renderedText = resolveTemplate(s.text, slotValues);

              return (
                <div
                  key={s.id}
                  className={
                    s.role === "bot" ? "flex justify-start" : "flex justify-end"
                  }
                >
                  <div
                    className={
                      s.role === "bot"
                        ? "max-w-[80%] rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-gray-800 shadow whitespace-pre-wrap break-all"
                        : "max-w-[80%] rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] text-white shadow whitespace-pre-wrap break-all"
                    }
                  >
                    {renderedText}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ScenarioNodeControls
        currentNode={currentNode}
        finished={finished}
        formValues={formValues}
        setFormValues={setFormValues}
        slotValues={slotValues}
        onReset={resetScenario}
        onContinueFromMessage={handleContinueFromMessage}
        onBranchClick={handleBranchClick}
        onSubmitForm={handleSubmitForm}
        onNextFromLink={handleNextFromLink}
        llmDone={llmDone}
        onContinueFromLlm={handleContinueFromLlm}
        onContinueFromIframe={handleContinueFromIframe}
        onSlotFillingClick={handleSlotFillingClick}
      />
    </div>
  );
}
