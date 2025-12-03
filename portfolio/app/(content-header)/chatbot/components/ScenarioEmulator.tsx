// app/(content-header)/chatbot/components/ScenarioEmulator.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store";
import * as builderBackendService from "../../builder/services/backendService";
import ScenarioNodeControls from "./ScenarioNodeControls";

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
  }) => void;
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
  onHistoryAppend,
}: ScenarioEmulatorProps) {
  const user = useStore((s: any) => s.user);
  const backend = useStore((s: any) => s.backend);

  const [nodes, setNodes] = useState<AnyNode[]>([]);
  const [edges, setEdges] = useState<AnyEdge[]>([]);
  const historyPushedRef = useRef(false);

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

  const [currentNode, setCurrentNode] = useState<AnyNode | null>(null);
  const [steps, setSteps] = useState<ChatStep[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!rootNode) {
      setCurrentNode(null);
      setSteps([]);
      setFinished(false);
      historyPushedRef.current = false;
      return;
    }

    setCurrentNode(rootNode);

    if (rootNode.type === "message") {
      setSteps([
        {
          id: rootNode.id,
          role: "bot",
          text: rootNode.data?.content ?? "",
        },
      ]);
    } else {
      setSteps([]);
    }
    setFinished(false);
    setFormValues({});
    historyPushedRef.current = false;
  }, [rootNode]);

  const resetScenario = () => {
    setFinished(false);
    setFormValues({});
    historyPushedRef.current = false;

    if (!rootNode) {
      setCurrentNode(null);
      setSteps([]);
      return;
    }
    setCurrentNode(rootNode);
    if (rootNode.type === "message") {
      setSteps([
        {
          id: rootNode.id,
          role: "bot",
          text: rootNode.data?.content ?? "",
        },
      ]);
    } else {
      setSteps([]);
    }
  };

  // 👇 끝났을 때 한 번만 부모에게 실행 결과 전달
  useEffect(() => {
    if (!finished) return;
    if (!steps.length) return;
    if (!onHistoryAppend) return;
    if (historyPushedRef.current) return;

    historyPushedRef.current = true;
    onHistoryAppend({ scenarioKey, scenarioTitle, steps });
  }, [finished, steps, onHistoryAppend, scenarioKey, scenarioTitle]);

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

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNode) return;

    const elements: any[] = currentNode.data?.elements ?? [];
    const summaryParts: string[] = [];

    elements.forEach((el) => {
      const value = formValues[el.name] ?? "";
      if (value) {
        summaryParts.push(`${el.label || el.name}: ${value}`);
      }
    });

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

      <div className="flex-1 overflow-y-auto rounded-md bg-emerald-50/40 p-2 text-xs">
        {steps.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-gray-400">
            시나리오를 시작하려면 초기화를 눌러주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((s) => (
              <div
                key={s.id}
                className={
                  s.role === "bot" ? "flex justify-start" : "flex justify-end"
                }
              >
                <div
                  className={
                    s.role === "bot"
                      ? "max-w-[80%] rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-gray-800 shadow"
                      : "max-w-[80%] rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] text-white shadow"
                  }
                >
                  {s.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScenarioNodeControls
        currentNode={currentNode}
        finished={finished}
        formValues={formValues}
        setFormValues={setFormValues}
        onReset={resetScenario}
        onContinueFromMessage={handleContinueFromMessage}
        onBranchClick={handleBranchClick}
        onSubmitForm={handleSubmitForm}
        onNextFromLink={handleNextFromLink}
      />
    </div>
  );
}
