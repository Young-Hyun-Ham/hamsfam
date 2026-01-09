// app/(content-header)/chatbot/components/emulator/hooks/useScenarioAutoRunner.ts
"use client";

import { useEffect } from "react";
import type { AnyNode } from "../../../types";
import { makeStepId } from "../../../utils";
import { findNextNode } from "../core/graph";

export function useScenarioAutoRunner(args: {
  currentNode: AnyNode | null;
  finished: boolean;

  nodes: AnyNode[];
  edges: any[];

  slotValues: Record<string, any>;

  // runners
  runApiNode: (node: AnyNode) => Promise<boolean>;
  runSetSlotNode: (node: AnyNode) => void;
  runLlmNode: (node: AnyNode, slotSnapshot: Record<string, any>) => Promise<boolean>;

  // ui helpers
  pushBotStep: (id: string, text: string) => void;
  pushBotStepOnce: (id: string, text: string) => void;

  // state
  setCurrentNodeId: (v: string | null) => void;
  setFinished: (v: boolean) => void;

  // llm state
  setLlmDone: (v: boolean) => void;

  // engine logger (현 동작 유지용 - 여기서는 필요 시만)
  logToEngine: (payload: any, params: any) => void;
  engineProps: any;
}) {
  useEffect(() => {
    const { currentNode, finished } = args;
    if (!currentNode) return;
    if (finished) return;

    let cancelled = false;

    // ✅ "한 번만 출력" 메시지는 절대 랜덤 id 쓰면 안 됨 (입력/리렌더마다 계속 찍힘)
    const promptStepId = (nodeId: string) => `prompt:${nodeId}`;

    const goNext = (handle?: string | null) => {
      const next =
        (handle ? findNextNode(args.nodes, args.edges, currentNode.id, handle) : null) ||
        findNextNode(args.nodes, args.edges, currentNode.id, "default") ||
        findNextNode(args.nodes, args.edges, currentNode.id, null);

      if (!next) {
        args.setFinished(true);
        return;
      }

      args.setCurrentNodeId(next.id);

      // ✅ message만 여기서 즉시 출력
      // (branch/form/link/iframe/slotfilling은 "노드 진입 시점" case에서 promptStepId로 1회 출력)
      if (next.type === "message") {
        args.pushBotStep(makeStepId(next.id), next.data?.content ?? "");
      }
    };

    (async () => {
      switch (currentNode.type) {
        case "message": {
          // message는 "진입 시점"에 이미 출력된 상태(현 구조 유지)
          return;
        }

        case "branch": {
          const q = currentNode.data?.content ?? "";
          args.pushBotStepOnce(promptStepId(currentNode.id), q);
          return;
        }

        case "form": {
          const title = currentNode.data?.title
            ? `폼: ${currentNode.data.title}`
            : "폼을 입력해 주세요.";
          args.pushBotStepOnce(promptStepId(currentNode.id), title);
          return;
        }

        case "link": {
          const msg = currentNode.data?.content ?? "링크로 이동합니다.";
          args.pushBotStepOnce(promptStepId(currentNode.id), msg);
          return;
        }

        case "iframe": {
          const msg = currentNode.data?.content ?? "iframe을 표시합니다.";
          args.pushBotStepOnce(promptStepId(currentNode.id), msg);
          return;
        }

        case "slotfilling": {
          const q = currentNode.data?.content ?? "값을 선택/입력해 주세요.";
          args.pushBotStepOnce(promptStepId(currentNode.id), q);
          return;
        }

        case "api": {
          const ok = await args.runApiNode(currentNode);
          if (cancelled) return;

          if (!ok) {
            const failNext = findNextNode(args.nodes, args.edges, currentNode.id, "onFail");
            if (failNext) {
              args.setCurrentNodeId(failNext.id);
              if (failNext.type === "message") {
                args.pushBotStep(makeStepId(failNext.id), failNext.data?.content ?? "");
              }
              return;
            }
            goNext("onSuccess");
            return;
          }

          goNext("onSuccess");
          return;
        }

        case "setSlot": {
          args.runSetSlotNode(currentNode);
          if (cancelled) return;
          goNext(null);
          return;
        }

        case "llm": {
          args.setLlmDone(false);
          const slotSnapshot = args.slotValues; // (의도적으로 그대로 snapshot)
          try {
            await args.runLlmNode(currentNode, slotSnapshot);
          } finally {
            if (!cancelled) args.setLlmDone(true);
          }
          return;
        }

        case "delay": {
          const duration = Number(currentNode.data?.duration ?? 1000);
          await new Promise((r) => setTimeout(r, duration));
          if (cancelled) return;
          goNext(null);
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
    args.currentNode,
    args.finished,
    args.nodes,
    args.edges,
    args.slotValues,
    args.runApiNode,
    args.runSetSlotNode,
    args.runLlmNode,
    args.pushBotStep,
    args.pushBotStepOnce,
    args.setCurrentNodeId,
    args.setFinished,
    args.setLlmDone,
    args.logToEngine,
    args.engineProps,
  ]);
}
