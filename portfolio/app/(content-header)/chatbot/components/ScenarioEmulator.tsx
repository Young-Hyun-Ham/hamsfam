// app/(content-header)/chatbot/components/ScenarioEmulator.tsx
"use client";

import { useMemo, useState } from "react";

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

type ChatStep = {
  id: string;
  role: "bot" | "user";
  text: string;
};

type ScenarioEmulatorProps = {
  nodes: AnyNode[];
  edges: AnyEdge[];
};

function findRootNode(nodes: AnyNode[], edges: AnyEdge[]): AnyNode | null {
  const targets = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targets.has(n.id)) ?? null;
}

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

export default function ScenarioEmulator({ nodes, edges }: ScenarioEmulatorProps) {
  const rootNode = useMemo(() => findRootNode(nodes, edges), [nodes, edges]);

  const [currentNode, setCurrentNode] = useState<AnyNode | null>(rootNode);
  const [steps, setSteps] = useState<ChatStep[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  // 시나리오 처음부터 다시 시작
  const resetScenario = () => {
    setFinished(false);
    setFormValues({});
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

  // 최초 진입 시 자동 시작
  // (패널 열릴 때 부모에서 한 번만 resetScenario 호출해도 됨)
  if (!steps.length && rootNode && !finished && !currentNode) {
    // 혹시 currentNode가 초기화된 경우를 대비
    setCurrentNode(rootNode);
    if (rootNode.type === "message") {
      setSteps([
        {
          id: rootNode.id,
          role: "bot",
          text: rootNode.data?.content ?? "",
        },
      ]);
    }
  }

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

    // 유저가 버튼 선택한 내용
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

  // 현재 노드 타입별 UI
  const renderCurrentControls = () => {
    if (!currentNode || finished) {
      return (
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-md border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
            onClick={resetScenario}
          >
            시나리오 다시 실행
          </button>
        </div>
      );
    }

    if (currentNode.type === "message") {
      return (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleContinueFromMessage}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            계속
          </button>
        </div>
      );
    }

    if (currentNode.type === "branch") {
      const replies: { display: string; value: string }[] =
        currentNode.data?.replies ?? [];
      return (
        <div className="mt-3 flex flex-wrap gap-2">
          {replies.map((r) => (
            <button
              key={r.value}
              onClick={() => handleBranchClick(r)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              {r.display}
            </button>
          ))}
        </div>
      );
    }

    if (currentNode.type === "form") {
      const elements: any[] = currentNode.data?.elements ?? [];
      return (
        <form onSubmit={handleSubmitForm} className="mt-3 space-y-3 text-xs">
          {elements.map((el) => (
            <div key={el.id} className="flex flex-col gap-1">
              <label className="font-medium text-gray-700">
                {el.label || el.name}
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder={el.placeholder || ""}
                value={formValues[el.name] ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [el.name]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              제출 & 다음
            </button>
          </div>
        </form>
      );
    }

    if (currentNode.type === "link") {
      const url = currentNode.data?.content ?? "";
      const label = currentNode.data?.display || "열기";
      return (
        <div className="mt-3 flex flex-col gap-2 text-xs">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
            >
              <span>{label}</span>
              <span className="text-[10px]">↗</span>
            </a>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNextFromLink}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              다음
            </button>
          </div>
        </div>
      );
    }

    return null;
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
                  s.role === "bot"
                    ? "flex justify-start"
                    : "flex justify-end"
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

      {renderCurrentControls()}
    </div>
  );
}
