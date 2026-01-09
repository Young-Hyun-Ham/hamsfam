// app/(content-header)/chatbot/components/emulator/hooks/useScenarioProgress.ts
"use client";

import { useEffect, useRef } from "react";
import { stableStringify } from "../core/stableStringify";
import type { ChatStep } from "../../../types";

export function useScenarioProgress(args: {
  scenarioRunId: string;
  scenarioKey: string;
  scenarioTitle?: string;

  didHydrate: boolean;
  resetInFlightRef: React.MutableRefObject<boolean>;

  persistedRun: any;

  currentNodeId: string | null;
  finished: boolean;
  steps: ChatStep[];
  slotValues: Record<string, any>;
  formValues: Record<string, any>;

  onProgress?: (payload: {
    runId: string;
    steps: ChatStep[];
    finished: boolean;
    currentNodeId: string | null;
    slotValues: Record<string, any>;
    formValues: Record<string, any>;
    resetting?: boolean;
  }) => void;

  saveScenarioRun: (runId: string, v: any) => void;
}) {
  const lastProgressSigRef = useRef<string>("");

  useEffect(() => {
    if (!args.scenarioRunId) return;
    if (!args.didHydrate) return;
    if (args.resetInFlightRef.current) return;

    const nodeId = args.currentNodeId ?? null;

    const hasAnyStep = (args.steps?.length ?? 0) > 0;
    const hasAnyState =
      Object.keys(args.slotValues ?? {}).length > 0 ||
      Object.keys(args.formValues ?? {}).length > 0;

    // 완전 초기 상태는 저장/전달 안함 (빈 값 덮어쓰기 + 루프 방지)
    if (!hasAnyStep && !hasAnyState && !args.persistedRun) return;

    const sig = stableStringify({
      scenarioRunId: args.scenarioRunId,
      scenarioKey: args.scenarioKey,
      nodeId,
      finished: args.finished,
      steps: args.steps, // raw
      slotValues: args.slotValues,
      formValues: args.formValues,
    });

    if (sig === lastProgressSigRef.current) return;
    lastProgressSigRef.current = sig;

    args.onProgress?.({
      runId: args.scenarioRunId,
      steps: args.steps, // raw
      finished: args.finished,
      currentNodeId: nodeId,
      slotValues: args.slotValues,
      formValues: args.formValues,
    });

    args.saveScenarioRun(args.scenarioRunId, {
      scenarioKey: args.scenarioKey,
      scenarioTitle: args.scenarioTitle,
      steps: args.steps, // raw 저장
      formValues: args.formValues,
      slotValues: args.slotValues,
      currentNodeId: nodeId,
      finished: args.finished,
    });
  }, [
    args.scenarioRunId,
    args.scenarioKey,
    args.scenarioTitle,
    args.currentNodeId,
    args.finished,
    args.steps,
    args.slotValues,
    args.formValues,
    args.persistedRun,
    args.onProgress,
    args.saveScenarioRun,
    args.didHydrate,
    args.resetInFlightRef,
  ]);

  return { lastProgressSigRef };
}
