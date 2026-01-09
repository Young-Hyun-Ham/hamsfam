// app/(content-header)/chatbot/components/emulator/hooks/useScenarioReset.ts
"use client";

import { useCallback } from "react";

export function useScenarioReset(args: {
  rootNodeId: string | null;
  scenarioRunId: string;
  clearScenarioRun: (runId: string) => void;

  // refs
  resetInFlightRef: React.MutableRefObject<boolean>;
  historyPushedRef: React.MutableRefObject<boolean>;
  lastProgressSigRef: React.MutableRefObject<string>;

  // setters
  setCurrentNodeId: (v: string | null) => void;
  setSteps: (v: any[]) => void;
  setFormValues: (v: Record<string, any>) => void;
  setSlotValues: (v: Record<string, any>) => void;
  setFinished: (v: boolean) => void;
  setLlmDone: (v: boolean) => void;

  // optional callback
  onResetRun?: (runId: string) => void;
}) {
  return useCallback(() => {
    args.resetInFlightRef.current = true;

    const rootId = args.rootNodeId ?? null;

    args.setCurrentNodeId(rootId);
    args.setSteps([]);
    args.setFormValues({});
    args.setSlotValues({});
    args.setFinished(false);
    args.setLlmDone(false);
    args.historyPushedRef.current = false;

    // ✅ progress dedupe 초기화(리셋 후 첫 progress가 정상 전송되게)
    args.lastProgressSigRef.current = "";

    if (args.scenarioRunId) args.clearScenarioRun(args.scenarioRunId);

    args.onResetRun?.(args.scenarioRunId)

    setTimeout(() => {
      args.resetInFlightRef.current = false;
    }, 0);
  }, [
    args.rootNodeId,
    args.scenarioRunId,
    args.clearScenarioRun,
    args.resetInFlightRef,
    args.historyPushedRef,
    args.lastProgressSigRef,
    args.setCurrentNodeId,
    args.setSteps,
    args.setFormValues,
    args.setSlotValues,
    args.setFinished,
    args.setLlmDone,
    args.onResetRun,
  ]);
}
