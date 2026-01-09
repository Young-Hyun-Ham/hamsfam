"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store";
import * as builderBackendService from "../../builder/services/backendService";
import ScenarioNodeControls from "./ScenarioNodeControls";
import useChatbotStore from "../store";
import { AnyEdge, AnyNode, ChatStep } from "../types";
import { makeStepId, resolveTemplate } from "../utils";
import { useEngineLogger } from "../utils/engine";

/** 루트 노드 찾기 */
function findRootNode(nodes: AnyNode[], edges: AnyEdge[]): AnyNode | null {
  const targets = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targets.has(n.id)) ?? null;
}

/** 다음 노드 찾기 */
function findNextNode(
  nodes: AnyNode[],
  edges: AnyEdge[],
  currentId: string,
  handle?: string | null,
): AnyNode | null {
  const candidates = edges.filter((e) => e.source === currentId);
  if (!candidates.length) return null;

  if (handle) {
    const matched = candidates.find((e) => e.sourceHandle === handle);
    if (matched) return nodes.find((n) => n.id === matched.target) ?? null;
  }

  const first = candidates[0];
  return nodes.find((n) => n.id === first.target) ?? null;
}

/** JSON stringify 안정화(키 정렬) */
function stableStringify(v: any) {
  const seen = new WeakSet();
  return JSON.stringify(v, function (_key, value) {
    if (value && typeof value === "object") {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);

      if (Array.isArray(value)) return value;

      return Object.keys(value)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = (value as any)[k];
          return acc;
        }, {});
    }
    return value;
  });
}

type ScenarioEmulatorProps = {
  scenarioKey: string;
  scenarioTitle?: string;

  scenarioRunId: string;

  onHistoryAppend?: (payload: {
    scenarioKey: string;
    scenarioTitle?: string;
    steps: ChatStep[];
    runId?: string;
  }) => void;

  onProgress?: (payload: {
    runId: string;
    steps: ChatStep[]; // ✅ 여기서는 "원본 step" 전달 (치환X)
    finished: boolean;
    currentNodeId: string | null;
    slotValues: Record<string, any>;
    formValues: Record<string, any>;
    resetting?: boolean;
  }) => void;

  onResetRun?: (runId: string) => void;

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

  const rootNode = useMemo(() => findRootNode(nodes, edges), [nodes, edges]);

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const currentNode = useMemo(
    () => (currentNodeId ? nodes.find((n) => n.id === currentNodeId) ?? null : null),
    [nodes, currentNodeId],
  );

  const [steps, setSteps] = useState<ChatStep[]>(initialSteps ?? []);
  const [formValues, setFormValues] = useState<Record<string, any>>(initialFormValues ?? {});
  const [slotValues, setSlotValues] = useState<Record<string, any>>(initialSlotValues ?? {});
  const [finished, setFinished] = useState<boolean>(initialFinished ?? false);
  const [llmDone, setLlmDone] = useState(false);

  // store persistence
  const persistedRun = useChatbotStore((s) =>
    scenarioRunId ? s.scenarioRuns[scenarioRunId] : undefined,
  );
  const saveScenarioRun = useChatbotStore((s) => s.saveScenarioRun);
  const clearScenarioRun = useChatbotStore((s) => s.clearScenarioRun);

  // hydration 1회 보장
  const didHydrateRef = useRef(false);

  // history append 1회 보장
  const historyPushedRef = useRef(false);

  // reset 중 progress 반영 제어
  const resetInFlightRef = useRef(false);

  // progress dedupe signature
  const lastProgressSigRef = useRef<string>("");

  // =============================================================================
  // 1) 시나리오 데이터 로딩
  // =============================================================================
  useEffect(() => {
    let mounted = true;

    const fetchScenarioData = async () => {
      const data = await builderBackendService.fetchScenarioData(backend, { scenarioId: scenarioKey });
      if (!mounted) return;
      setNodes(data.nodes);
      setEdges(data.edges);
    };

    fetchScenarioData();

    return () => {
      mounted = false;
    };
  }, [backend, scenarioKey]);

  // =============================================================================
  // 2) hydration (persistedRun > initial* > root)
  // =============================================================================
  useEffect(() => {
    if (!nodes.length) return;
    if (didHydrateRef.current) return;

    const restoreNodeId =
      persistedRun?.currentNodeId ??
      initialCurrentNodeId ??
      rootNode?.id ??
      null;

    setCurrentNodeId(restoreNodeId);

    if (persistedRun) {
      setSteps(persistedRun.steps ?? []);
      setSlotValues(persistedRun.slotValues ?? {});
      setFormValues(persistedRun.formValues ?? {});
      setFinished(Boolean(persistedRun.finished));
    } else {
      setSteps(initialSteps ?? []);
      setSlotValues(initialSlotValues ?? {});
      setFormValues(initialFormValues ?? {});
      setFinished(Boolean(initialFinished ?? false));
    }

    didHydrateRef.current = true;
  }, [
    nodes.length,
    rootNode?.id,
    persistedRun,
    initialCurrentNodeId,
    initialSteps,
    initialSlotValues,
    initialFormValues,
    initialFinished,
  ]);

  // =============================================================================
  // 3) Engine logging init
  // =============================================================================
  const userId = user?.uid ?? user?.id ?? user?.sub ?? "guest";
  const engineProps = useMemo(
    () => ({ nodes, edges, scenarioKey, scenarioRunId, userId }),
    [nodes, edges, scenarioKey, scenarioRunId, userId],
  );

  const { logToEngine, resetEngineState } = useEngineLogger();

  useEffect(() => {
    if (!scenarioRunId) return;
    if (!nodes.length || !edges.length) return;

    resetEngineState();
    // 엔진쪽에 "run 시작" 한 번 찍기
    logToEngine({ text: "" }, engineProps);
  }, [scenarioRunId, nodes.length, edges.length, resetEngineState, logToEngine, engineProps]);

  // =============================================================================
  // 4) progress emit (변경 있을 때만)
  // =============================================================================
  useEffect(() => {
    if (!scenarioRunId) return;
    if (!didHydrateRef.current) return;
    if (resetInFlightRef.current) return;

    const nodeId = currentNodeId ?? null;

    const hasAnyStep = (steps?.length ?? 0) > 0;
    const hasAnyState =
      Object.keys(slotValues ?? {}).length > 0 || Object.keys(formValues ?? {}).length > 0;

    // 완전 초기 상태는 저장/전달 안함 (빈 값 덮어쓰기 + 루프 방지)
    if (!hasAnyStep && !hasAnyState && !persistedRun) return;

    // ✅ 중요: 여기서는 resolveTemplate 적용한 텍스트를 저장/전달에 포함하지 않는다.
    // (slot 변화에 따라 렌더마다 문자열이 달라지는 케이스가 생기면 루프가 쉽게 발생)
    const sig = stableStringify({
      scenarioRunId,
      scenarioKey,
      nodeId,
      finished,
      steps, // raw
      slotValues,
      formValues,
    });

    if (sig === lastProgressSigRef.current) return;
    lastProgressSigRef.current = sig;

    onProgress?.({
      runId: scenarioRunId,
      steps, // raw
      finished,
      currentNodeId: nodeId,
      slotValues,
      formValues,
    });

    saveScenarioRun(scenarioRunId, {
      scenarioKey,
      scenarioTitle,
      steps, // raw 저장
      formValues,
      slotValues,
      currentNodeId: nodeId,
      finished,
    });
  }, [
    scenarioRunId,
    scenarioKey,
    scenarioTitle,
    currentNodeId,
    finished,
    steps,
    slotValues,
    formValues,
    persistedRun,
    onProgress,
    saveScenarioRun,
  ]);

  // =============================================================================
  // 5) 완료 시 history append (1회) - 여기서는 치환된 steps로 보냄(최종 결과)
  // =============================================================================
  useEffect(() => {
    if (!finished) return;
    if (!steps.length) return;
    if (!onHistoryAppend) return;
    if (historyPushedRef.current) return;

    historyPushedRef.current = true;

    const resolvedSteps = steps.map((s) => ({
      ...s,
      text: resolveTemplate(s.text, slotValues),
    }));

    onHistoryAppend({
      scenarioKey,
      scenarioTitle,
      steps: resolvedSteps,
      runId: scenarioRunId,
    });
  }, [finished, steps, slotValues, onHistoryAppend, scenarioKey, scenarioTitle, scenarioRunId]);

  // =============================================================================
  // 6) step push 유틸
  // =============================================================================
  const pushBotStep = useCallback((id: string, text: string) => {
    setSteps((prev) => [...prev, { id, role: "bot", text }]);
  }, []);

  const pushBotStepOnce = useCallback((id: string, text: string) => {
    setSteps((prev) => {
      if (prev.some((s) => s.id === id)) return prev;
      return [...prev, { id, role: "bot", text }];
    });
  }, []);

  const pushUserStep = useCallback((id: string, text: string) => {
    setSteps((prev) => [...prev, { id, role: "user", text }]);
  }, []);

  // =============================================================================
  // 7) reset
  // =============================================================================
  const resetScenario = useCallback(() => {
    resetInFlightRef.current = true;

    const rootId = rootNode?.id ?? null;

    setCurrentNodeId(rootId);
    setSteps([]);
    setFormValues({});
    setSlotValues({});
    setFinished(false);
    setLlmDone(false);
    historyPushedRef.current = false;

    // ✅ progress dedupe 초기화(리셋 후 첫 progress가 정상 전송되게)
    lastProgressSigRef.current = "";

    if (scenarioRunId) clearScenarioRun(scenarioRunId);
    onResetRun?.(scenarioRunId);

    // resetting 1회 전달(원한다면)
    onProgress?.({
      runId: scenarioRunId,
      steps: [],
      finished: false,
      currentNodeId: rootId,
      slotValues: {},
      formValues: {},
      resetting: true,
    });

    queueMicrotask(() => {
      resetInFlightRef.current = false;
    });
  }, [rootNode?.id, scenarioRunId, clearScenarioRun, onResetRun, onProgress]);

  // =============================================================================
  // 8) 노드 실행기
  // =============================================================================
  const runSetSlotNode = useCallback(
    (node: AnyNode) => {
      const assignments: any[] = node.data?.assignments ?? [];
      if (!assignments.length) return;

      setSlotValues((prev) => {
        const next = { ...prev };

        for (const a of assignments) {
          if (!a) continue;

          // 신규 포맷: { key, value }
          if (a.key && a.value !== undefined && !a.slot && !a.from) {
            next[a.key] = a.value;
            continue;
          }

          // 기존 포맷
          if (!a.slot) continue;

          if (a.from === "literal") next[a.slot] = a.value ?? "";
          if (a.from === "form" && a.key) next[a.slot] = formValues[a.key];
          if (a.from === "slot" && a.key) next[a.slot] = prev[a.key];
        }

        return next;
      });
    },
    [formValues],
  );

  const runApiNode = useCallback(
    async (node: AnyNode) => {
      try {
        const { url, method, headers, body, responseMapping } = node.data ?? {};
        const ctx = { ...slotValues, ...formValues };

        const resolvedUrl = resolveTemplate(String(url ?? ""), ctx);
        const resolvedBody = body ? resolveTemplate(String(body), ctx) : undefined;

        let parsedHeaders: Record<string, any> = {};
        try {
          parsedHeaders = headers ? JSON.parse(headers) : {};
        } catch (e) {
          console.error("Header JSON parsing error:", e);
        }

        const options: any = { method: method || "GET", headers: parsedHeaders };
        if (String(options.method).toUpperCase() !== "GET" && resolvedBody) {
          options.body = resolvedBody;
        }

        const res = await fetch(resolvedUrl, options);
        const json = await res.json();

        if (Array.isArray(responseMapping)) {
          setSlotValues((prev: any) => {
            const next = { ...prev };
            responseMapping.forEach((m) => {
              next[m.slot] = json?.[m.path];
            });
            return next;
          });
        }

        return true;
      } catch (e) {
        console.error("API 실행 오류:", e);
        return false;
      }
    },
    [slotValues, formValues],
  );

  const systemPrompt = useChatbotStore((s: any) => s.systemPrompt);

  const runLlmNode = useCallback(
    async (node: AnyNode, slotSnapshot: Record<string, any>) => {
      try {
        const rawPrompt: string = node.data?.prompt ?? "";
        const prompt = resolveTemplate(rawPrompt, slotSnapshot);
        const outputVar: string = node.data?.outputVar || "llm_output";

        const res = await fetch("/api/chat/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, systemPrompt }),
        });

        if (!res.ok || !res.body) {
          pushBotStep(makeStepId(`${node.id}-err`), `[LLM 오류] 상태 코드: ${res.status}`);
          return false;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");

        const stepId = makeStepId(node.id);
        let accumulated = "";

        // 빈 step 먼저 만들고 스트리밍으로 patch
        setSteps((prev) => [...prev, { id: stepId, role: "bot", text: "" }]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          const chunkText = decoder.decode(value, { stream: true });
          if (!chunkText) continue;

          accumulated += chunkText;

          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, text: accumulated } : s)),
          );
        }

        setSlotValues((prev) => ({ ...prev, [outputVar]: accumulated }));
        return true;
      } catch (e) {
        console.error("LLM 노드 실행 오류:", e);
        pushBotStep(makeStepId(`${node.id}-err`), "[LLM 실행 오류가 발생했습니다.]");
        return false;
      }
    },
    [systemPrompt, pushBotStep],
  );

  // =============================================================================
  // 9) 노드 자동 실행(effect)
  // =============================================================================
  useEffect(() => {
    if (!currentNode) return;
    if (finished) return;

    let cancelled = false;

    const goNext = (handle?: string | null) => {
      const next =
        (handle ? findNextNode(nodes, edges, currentNode.id, handle) : null) ||
        findNextNode(nodes, edges, currentNode.id, "default") ||
        findNextNode(nodes, edges, currentNode.id, null);

      if (!next) {
        setFinished(true);
        return null;
      }

      setCurrentNodeId(next.id);

      // message면 자동으로 step 추가
      if (next.type === "message") {
        pushBotStep(makeStepId(next.id), next.data?.content ?? "");
      }

      return next;
    };

    (async () => {
      switch (currentNode.type) {
        case "api": {
          const ok = await runApiNode(currentNode);
          if (cancelled) return;

          if (!ok) {
            const failNext = findNextNode(nodes, edges, currentNode.id, "onFail");
            if (!failNext) {
              setFinished(true);
              return;
            }
            setCurrentNodeId(failNext.id);
            if (failNext.type === "message") {
              pushBotStep(makeStepId(failNext.id), failNext.data?.content ?? "");
            }
            return;
          }

          goNext("onSuccess");
          return;
        }

        case "setSlot": {
          runSetSlotNode(currentNode);
          if (cancelled) return;
          goNext(null);
          return;
        }

        case "llm": {
          setLlmDone(false);
          const slotSnapshot = slotValues; // snapshot (의도적으로 그대로)

          try {
            await runLlmNode(currentNode, slotSnapshot);
          } finally {
            if (!cancelled) setLlmDone(true);
          }
          return;
        }

        case "delay": {
          const duration = Number(currentNode.data?.duration ?? 1000);
          await new Promise((r) => setTimeout(r, duration));
          if (cancelled) return;
          goNext("default");
          return;
        }

        case "slotFilling":
        case "slotfilling": {
          // 질문은 중복 push 방지
          const q = currentNode.data?.content ?? "값을 선택/입력해 주세요.";
          pushBotStepOnce(makeStepId(currentNode.id), q);
          return;
        }

        default:
          return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentNode,
    finished,
    nodes,
    edges,
    slotValues,
    runApiNode,
    runSetSlotNode,
    runLlmNode,
    pushBotStep,
    pushBotStepOnce,
  ]);

  // =============================================================================
  // 10) UI 핸들러들(ScenarioNodeControls 연동)
  // =============================================================================
  const handleContinueFromMessage = useCallback(() => {
    if (!currentNode) return;

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    } else if (next.type === "branch") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    } else if (next.type === "form") {
      pushBotStep(makeStepId(next.id), next.data?.title ? `폼: ${next.data.title}` : "폼을 입력해 주세요.");
    } else if (next.type === "link") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "링크로 이동합니다.");
    }
  }, [currentNode, nodes, edges, pushBotStep]);

  const handleContinueFromLlm = useCallback(() => {
    if (!currentNode) return;

    const next =
      findNextNode(nodes, edges, currentNode.id, "default") ||
      findNextNode(nodes, edges, currentNode.id, null);

    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);
    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine({ action: { type: "reply", value: "continue", display: "continue" } }, engineProps);
  }, [currentNode, nodes, edges, pushBotStep, logToEngine, engineProps]);

  const handleBranchClick = useCallback(
    (reply: { display: string; value: string }) => {
      if (!currentNode) return;

      pushUserStep(makeStepId(`${currentNode.id}-${reply.value}`), reply.display);

      const next = findNextNode(nodes, edges, currentNode.id, reply.value);
      if (!next) {
        setFinished(true);
        return;
      }

      setCurrentNodeId(next.id);

      if (next.type === "message") {
        pushBotStep(makeStepId(next.id), next.data?.content ?? "");
      } else if (next.type === "form") {
        pushBotStep(makeStepId(next.id), next.data?.title ? `폼: ${next.data.title}` : "폼을 입력해 주세요.");
      } else if (next.type === "link") {
        pushBotStep(makeStepId(next.id), next.data?.content ?? "링크로 이동합니다.");
      }

      logToEngine(
        { action: { type: "reply", value: reply.value, display: reply.display } },
        engineProps,
      );
    },
    [currentNode, nodes, edges, pushUserStep, pushBotStep, logToEngine, engineProps],
  );

  const handleSubmitForm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentNode) return;

      const elements: any[] = currentNode.data?.elements ?? [];
      const summaryParts: string[] = [];

      const formSlotKey: string | undefined = currentNode.data?.slotKey;
      const formObject: Record<string, any> = {};

      const formatAny = (v: any): string => {
        if (v === null || v === undefined) return "";
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      };

      for (const el of elements) {
        const value = formValues[el.name];

        if (value !== undefined && value !== null && value !== "") {
          formObject[el.name] = value;
        }

        // grid/search 등은 기존 방식 유지(필요시 여기에서 확장)
        if (el.type === "grid") continue;

        if (value === undefined || value === null || value === "") continue;
        const label = el.label || el.name;
        summaryParts.push(`${label}: ${formatAny(value)}`);
      }

      if (formSlotKey) {
        setSlotValues((prev: any) => {
          const prevFormSlot = prev?.[formSlotKey] ?? {};
          return {
            ...prev,
            [formSlotKey]: {
              ...prevFormSlot,
              ...formObject,
            },
          };
        });
      }

      pushUserStep(
        makeStepId(`${currentNode.id}-form`),
        summaryParts.length > 0 ? summaryParts.join("\n") : "폼을 제출했습니다.",
      );

      const next = findNextNode(nodes, edges, currentNode.id, null);
      if (!next) {
        setFinished(true);
        return;
      }

      setCurrentNodeId(next.id);

      if (next.type === "message") {
        pushBotStep(makeStepId(next.id), next.data?.content ?? "");
      } else if (next.type === "link") {
        pushBotStep(makeStepId(next.id), next.data?.content ?? "링크로 이동합니다.");
      }

      logToEngine(
        { action: { type: "reply", value: formValues, display: "form" } },
        engineProps,
      );
    },
    [currentNode, nodes, edges, formValues, pushUserStep, pushBotStep, logToEngine, engineProps],
  );

  const handleNextFromLink = useCallback(() => {
    if (!currentNode) return;

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine({ action: { type: "reply", value: "continue", display: "continue" } }, engineProps);
  }, [currentNode, nodes, edges, pushBotStep, logToEngine, engineProps]);

  const handleContinueFromIframe = useCallback(() => {
    if (!currentNode) return;

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    } else if (next.type === "link") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "링크로 이동합니다.");
    } else if (next.type === "form") {
      pushBotStep(makeStepId(next.id), next.data?.title ? `폼: ${next.data.title}` : "폼을 입력해 주세요.");
    }

    logToEngine({ action: { type: "reply", value: "continue", display: "continue" } }, engineProps);
  }, [currentNode, nodes, edges, pushBotStep, logToEngine, engineProps]);

  const handleSlotFillingClick = useCallback(
    (reply: { display: string; value: any }) => {
      if (!currentNode) return;

      const slotName: string = currentNode.data?.slot ?? currentNode.data?.slotName ?? "";
      if (slotName) setSlotValues((prev) => ({ ...prev, [slotName]: reply.value }));

      const handle = String(reply.value);
      const next =
        findNextNode(nodes, edges, currentNode.id, handle) ||
        findNextNode(nodes, edges, currentNode.id, "default") ||
        findNextNode(nodes, edges, currentNode.id, null);

      if (!next) {
        setFinished(true);
        return;
      }

      setCurrentNodeId(next.id);
      if (next.type === "message") {
        pushBotStep(makeStepId(next.id), next.data?.content ?? "");
      }

      logToEngine(
        { action: { type: "reply", value: reply.value, display: reply.display } },
        engineProps,
      );
    },
    [currentNode, nodes, edges, pushBotStep, logToEngine, engineProps],
  );

  // =============================================================================
  // UI
  // =============================================================================
  return (
    <div className="flex h-full flex-col rounded-xl border border-emerald-100 bg-white/80 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-700">시나리오 애뮬레이터</span>
        <button
          className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50"
          onClick={resetScenario}
          type="button"
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
              // UI에서만 치환
              const renderedText = resolveTemplate(s.text, slotValues);
              return (
                <div
                  key={s.id}
                  className={s.role === "bot" ? "flex justify-start" : "flex justify-end"}
                >
                  <div
                    className={
                      s.role === "bot"
                        ? "max-w-[80%] rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-gray-800 shadow whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                        : "max-w-[80%] rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] text-white shadow whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
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
