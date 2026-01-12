// app/(content-header)/chatbot/components/emulator/ScenarioEmulator.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useStore } from "@/store"
import ScenarioNodeControls from "../ScenarioNodeControls";
import useChatbotStore from "../../store";
import type { AnyNode, ChatStep } from "../../types";
import { makeStepId, resolveTemplate } from "../../utils";
import { useEngineLogger } from "../../utils/engine";

import { useScenarioDefinition } from "./hooks/useScenarioDefinition";
import { useScenarioHydration } from "./hooks/useScenarioHydration";
import { useScenarioProgress } from "./hooks/useScenarioProgress";
import { useScenarioHistoryAppend } from "./hooks/useScenarioHistoryAppend";
import { useScenarioReset } from "./hooks/useScenarioReset";
import { useScenarioAutoRunner } from "./hooks/useScenarioAutoRunner";

import { findRootNode } from "./core/graph";

import { runSetSlotNode as runSetSlotNodeImpl } from "./runners/runSetSlotNode";
import { runApiNode as runApiNodeImpl } from "./runners/runApiNode";
import { runLlmNode as runLlmNodeImpl } from "./runners/runLlmNode";

import { createUiHandlers } from "./handlers/createUiHandlers";

export type ScenarioEmulatorProps = {
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
    steps: ChatStep[];
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
  // =============================================================================
  // 1) 시나리오 데이터 로드
  // =============================================================================
  const { nodes, edges } = useScenarioDefinition(scenarioKey);

  // =============================================================================
  // 2) store persistence
  // =============================================================================
  const persistedRun = useChatbotStore((s) =>
    scenarioRunId ? s.scenarioRuns[scenarioRunId] : undefined,
  );
  const saveScenarioRun = useChatbotStore((s) => s.saveScenarioRun);
  const clearScenarioRun = useChatbotStore((s) => s.clearScenarioRun);

  // =============================================================================
  // 3) 로컬 상태
  // =============================================================================
  const rootNode = useMemo(() => findRootNode(nodes, edges), [nodes, edges]);

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(initialCurrentNodeId ?? null);
  const [steps, setSteps] = useState<ChatStep[]>(initialSteps ?? []);
  const [formValues, setFormValues] = useState<Record<string, any>>(initialFormValues ?? {});
  const [slotValues, setSlotValues] = useState<Record<string, any>>(initialSlotValues ?? {});
  const [finished, setFinished] = useState<boolean>(initialFinished ?? false);
  const [llmDone, setLlmDone] = useState(false);

  const currentNode = useMemo(
    () => nodes.find((n) => n.id === currentNodeId) ?? null,
    [nodes, currentNodeId],
  );

  // =============================================================================
  // 4) hydration (persisted > initial > root) - 1회만
  // =============================================================================
  const { didHydrateRef } = useScenarioHydration({
    nodesReady: nodes.length > 0,
    rootNode,
    persistedRun,
    initialSteps,
    initialFinished,
    initialCurrentNodeId,
    initialSlotValues,
    initialFormValues,
    setCurrentNodeId,
    setSteps,
    setSlotValues,
    setFormValues,
    setFinished,
  });

  // =============================================================================
  // 5) 엔진 로깅
  // =============================================================================
  const { logToEngine } = useEngineLogger();
  const { user } = useStore();
  const engineProps = useMemo(
    () => ({
      nodes,
      edges,
      scenarioKey,
      scenarioRunId,
      userId: user.id,
    }),
    [nodes, edges, scenarioKey, scenarioRunId],
  );

  // =============================================================================
  // 6) step push 유틸 
  // text에 {{key}} 그래도 디비에 저장 하고 싶으면?
  // - resolveTemplate(text, slotValues) 제거
  // - display에서 치환 - ChatMessageItem.tsx에서 detailText를 resolveTemplate() 함수를 사용해서 치환 처리
  // =============================================================================
  const pushBotStep = useCallback((id: string, text: string) => {
    setSteps((prev) => [...prev, { id, role: "bot", text: resolveTemplate(text, slotValues) }]);
  }, []);

  const pushBotStepOnce = useCallback((id: string, text: string) => {
    setSteps((prev) => {
      if (prev.some((s) => s.id === id)) return prev;
      return [...prev, { id, role: "bot", text: resolveTemplate(text, slotValues) }];
    });
  }, []);

  const pushUserStep = useCallback((id: string, text: string) => {
    setSteps((prev) => [...prev, { id, role: "user", text }]);
  }, []);

  // =============================================================================
  // 7) runners (useCallback로 기존 동작 유지)
  // =============================================================================
  const systemPrompt = useChatbotStore((s: any) => s.systemPrompt);

  const runSetSlotNode = useCallback(
    (node: AnyNode) => runSetSlotNodeImpl(node, { formValues, setSlotValues }),
    [formValues],
  );

  const runApiNode = useCallback(
    async (node: AnyNode) => runApiNodeImpl(node, { slotValues, formValues, setSlotValues }),
    [slotValues, formValues],
  );

  const runLlmNode = useCallback(
    async (node: AnyNode, slotSnapshot: Record<string, any>) =>
      runLlmNodeImpl(node, slotSnapshot, { systemPrompt, pushBotStep, setSteps, setSlotValues }),
    [systemPrompt, pushBotStep],
  );

  // =============================================================================
  // 8) progress emit + persist
  // =============================================================================
  const resetInFlightRef = useRef(false);
  const { lastProgressSigRef } = useScenarioProgress({
    scenarioRunId,
    scenarioKey,
    scenarioTitle,
    didHydrate: didHydrateRef.current,
    resetInFlightRef,
    persistedRun,
    currentNodeId,
    finished,
    steps,
    slotValues,
    formValues,
    onProgress,
    saveScenarioRun,
  });

  // =============================================================================
  // 9) history append (finished 시 1회)
  // =============================================================================
  const { historyPushedRef } = useScenarioHistoryAppend({
    finished,
    steps,
    slotValues,
    scenarioKey,
    scenarioTitle,
    scenarioRunId,
    onHistoryAppend,
  });

  // =============================================================================
  // 10) reset
  // =============================================================================
  const resetScenario = useScenarioReset({
    rootNodeId: rootNode?.id ?? null,
    scenarioRunId,
    clearScenarioRun,

    resetInFlightRef,
    historyPushedRef,
    lastProgressSigRef,

    setCurrentNodeId,
    setSteps,
    setFormValues,
    setSlotValues,
    setFinished,
    setLlmDone,

    onResetRun,
  });

  // =============================================================================
  // 11) auto runner (노드 자동 실행)
  // =============================================================================
  useScenarioAutoRunner({
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

    setCurrentNodeId,
    setFinished,
    setLlmDone,

    logToEngine,
    engineProps,
  });

  // =============================================================================
  // 12) UI handlers (ScenarioNodeControls 연동)
  // =============================================================================
  const {
    handleContinueFromMessage,
    handleContinueFromLlm,
    handleBranchClick,
    handleSubmitForm,
    handleNextFromLink,
    handleContinueFromIframe,
    handleSlotFillingClick,
  } = useMemo(
    () =>
      createUiHandlers({
        nodes,
        edges,
        currentNode,
        setCurrentNodeId,
        setFinished,
        formValues,
        setSlotValues,
        pushBotStep,
        pushUserStep,
        logToEngine,
        engineProps,
      }),
    [
      nodes,
      edges,
      currentNode,
      formValues,
      setSlotValues,
      pushBotStep,
      pushUserStep,
      logToEngine,
      engineProps,
    ],
  );

  // =============================================================================
  // 13) render
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
        {steps.length === 0 && !currentNode ? (
          <div className="flex h-full items-center justify-center text-[11px] text-gray-500">
            시나리오를 시작하려면 초기화를 눌러주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((s) => {
              // UI에서만 치환(현 동작 유지)
              const renderedText = resolveTemplate(s.text, slotValues);
              return (
                <div
                  key={s.id}
                  className={s.role === "bot" ? "flex justify-start" : "flex justify-end"}
                >
                  <div
                    className={
                      s.role === "bot"
                        ? "max-w-[80%] whitespace-pre-wrap break-words rounded-lg bg-white px-2 py-1 text-gray-800 shadow-sm"
                        : "max-w-[80%] whitespace-pre-wrap break-words rounded-lg bg-emerald-600 px-2 py-1 text-white shadow-sm"
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
