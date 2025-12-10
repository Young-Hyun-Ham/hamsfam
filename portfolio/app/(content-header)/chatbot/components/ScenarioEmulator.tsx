// app/(content-header)/chatbot/components/ScenarioEmulator.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store";
import * as builderBackendService from "../../builder/services/backendService";
import ScenarioNodeControls from "./ScenarioNodeControls";
import { resolveTemplate } from "../utils";
import useChatbotStore from "../store";

type AnyNode = {
  id: string;
  type: string;
  data: any;
};

type AnyEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type ChatStep = {
  id: string;
  role: "bot" | "user";
  text: string;
};

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
  }) => void;

  // 재시작(초기화) 시 부모에게 알려줄 콜백
  onResetRun?: (runId: string) => void;
  // 메시지에 저장된 실행 로그를 초기값으로 받기
  initialSteps?: ChatStep[];
  initialFinished?: boolean;
};

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

export default function ScenarioEmulator({
  scenarioKey,
  scenarioTitle,
  scenarioRunId,
  onHistoryAppend,
  onProgress,
  onResetRun, 
  initialSteps,
  initialFinished,
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
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [slotValues, setSlotValues] = useState<Record<string, any>>({});
  const [finished, setFinished] = useState(initialFinished ?? false);

  // 한 번만 store 에서 복원했는지 여부
  const [hydratedFromStore, setHydratedFromStore] = useState(false);

  // nodes / rootNode 는 기존 코드에 이미 있음
  useEffect(() => {
    if (!scenarioRunId) return;
    if (hydratedFromStore) return;
    if (!persistedRun) return;
    // 빌더 노드 로딩이 아직 안 끝났으면 rootNode 가 null 일 수 있으니 그때는 대기
    if (!nodes || !nodes.length) return;

    setHydratedFromStore(true);

    setSteps(persistedRun.steps || []);
    setFormValues(persistedRun.formValues || {});
    setSlotValues(persistedRun.slotValues || {});
    setFinished(persistedRun.finished ?? false);

    if (persistedRun.currentNodeId) {
      const found = nodes.find((n) => n.id === persistedRun.currentNodeId);
      setCurrentNode(found ?? rootNode);
    } else {
      setCurrentNode(rootNode);
    }
  }, [scenarioRunId, hydratedFromStore, persistedRun, nodes, rootNode]);

  useEffect(() => {
    if (!scenarioRunId || !onProgress) return;

    // 이전 실행 기록(persistedRun)이 있는데
    // 아직 복구(hydratedFromStore) 전 + 비어있는 초기 상태라면 부모로 보내지 않음
    if (persistedRun && !hydratedFromStore) {
      if (steps.length === 0 && !finished) {
        return;
      }
    }

    onProgress({
      runId: scenarioRunId,
      steps,
      finished,
    });
  }, [
    scenarioRunId,
    steps,
    finished,
    onProgress,
    persistedRun,
    hydratedFromStore,
  ]);
  
  useEffect(() => {
    if (!scenarioRunId) return;

    saveScenarioRun(scenarioRunId, {
      scenarioKey,
      scenarioTitle,
      steps,
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
  ]);

  function resetScenario() {
    setCurrentNode(rootNode);
    setSteps([]);
    setFormValues({});
    setSlotValues({});
    setFinished(false);
    historyPushedRef.current = false;

    if (scenarioRunId) {
      clearScenarioRun(scenarioRunId);
    }
    // 부모(ChatContainer)에게 "이 runId 다시 시작했어" 알려주기
    if (onResetRun) {
      onResetRun(scenarioRunId);
    }
  }

  // 👇 끝났을 때 한 번만 부모에게 실행 결과 전달
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

    return () => {
      cancelled = true;
    };
  }, [currentNode, nodes, edges]);

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

      // 🔹 우선 빈 버블 하나 추가해두고, 그걸 계속 업데이트
      const stepId = node.id;
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

          // 🔹 마지막 LLM 말풍선을 누적 텍스트로 계속 갱신
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
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "branch") {
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
          id: next.id,
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
          id: next.id,
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
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    }
  };

  // branch 노드 후 분기 선택 핸들러
  const handleBranchClick = (reply: { display: string; value: string }) => {
    if (!currentNode) return;

    setSteps((prev) => [
      ...prev,
      {
        id: `${currentNode.id}-${reply.value}`,
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
          id: next.id,
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
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "링크로 이동합니다.",
        },
      ]);
    }
  };

  // 폼 노드 제출 후 핸들러
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNode) return;

    const elements: any[] = currentNode.data?.elements ?? [];
    const summaryParts: string[] = [];

    // 추가: 이 폼에 설정된 slotKey
    const formSlotKey: string | undefined = currentNode.data?.slotKey;

    // 이 폼에서 사용한 값들을 한 객체로 모으기
    const formObject: Record<string, string> = {};

    elements.forEach((el) => {
      const value = formValues[el.name] ?? "";
      if (value) {
        summaryParts.push(`${el.label || el.name}: ${value}`);
      }
    });

    if (formSlotKey) {
      setSlotValues((prev: any) => {
        const prevFormdatas = prev[formSlotKey] || {};

        // 1) 그리드에서 선택된 데이터 (있다면)
        const selectedGridData = formValues.gridData;

        // 2) 선택이 없다면, 전체 scenarios 사용
        const fallbackGridData = prev.scenarios; // API 노드에서 이미 저장한 리스트

        const finalGridData =
          selectedGridData && Object.keys(selectedGridData).length > 0
            ? selectedGridData
            : fallbackGridData;

        // 3) 기본적으로 formValues 전부를 머지
        const mergedFormdatas: any = {
          ...prevFormdatas,
          ...formValues,
        };

        // 4) gridData는 위에서 구한 finalGridData로 강제 세팅
        if (finalGridData) {
          mergedFormdatas.gridData = finalGridData;
        }

        const next = {
          ...prev,
          [formSlotKey]: mergedFormdatas,
        };
        // console.log("[slotValues 업데이트] prev:", prev);
        // console.log("[slotValues 업데이트] next:", next);
        return next;
      });
    }
    // console.log(slotValues)는 아직 이전 값이므로 참고용으로만 사용
    // console.log("slotValues =======> :", slotValues);
    setSteps((prev) => [
      ...prev,
      {
        id: `${currentNode.id}-form`,
        role: "user",
        text:
          summaryParts.length > 0
            ? summaryParts.join(", ")
            : "폼을 제출했습니다.",
      },
    ]);

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
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "link") {
      setSteps((prev) => [
        ...prev,
        {
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "링크로 이동합니다.",
        },
      ]);
    }
  };

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
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    }
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
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "",
        },
      ]);
    } else if (next.type === "link") {
      setSteps((prev) => [
        ...prev,
        {
          id: next.id,
          role: "bot",
          text: next.data?.content ?? "링크로 이동합니다.",
        },
      ]);
    } else if (next.type === "form") {
      setSteps((prev) => [
        ...prev,
        {
          id: next.id,
          role: "bot",
          text: next.data?.title
            ? `폼: ${next.data.title}`
            : "폼을 입력해 주세요.",
        },
      ]);
    }
  };

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
      />
    </div>
  );
}
