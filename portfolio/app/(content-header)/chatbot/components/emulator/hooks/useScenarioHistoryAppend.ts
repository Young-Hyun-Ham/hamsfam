// app/(content-header)/chatbot/components/emulator/hooks/useScenarioHistoryAppend.ts
"use client";

import { useEffect, useRef } from "react";
import { resolveTemplate } from "../../../../chatbot/utils";
import type { ChatStep } from "../../../types";

export function useScenarioHistoryAppend(args: {
  finished: boolean;
  steps: ChatStep[];
  slotValues: Record<string, any>;

  scenarioKey: string;
  scenarioTitle?: string;
  scenarioRunId: string;

  onHistoryAppend?: (payload: {
    scenarioKey: string;
    scenarioTitle?: string;
    steps: ChatStep[];
    runId?: string;
  }) => void;
}) {
  const historyPushedRef = useRef(false);

  useEffect(() => {
    if (!args.finished) return;
    if (!args.steps.length) return;
    if (!args.onHistoryAppend) return;
    if (historyPushedRef.current) return;

    historyPushedRef.current = true;

    const resolvedSteps = args.steps.map((s) => ({
      ...s,
      text: resolveTemplate(s.text, args.slotValues),
    }));

    args.onHistoryAppend({
      scenarioKey: args.scenarioKey,
      scenarioTitle: args.scenarioTitle,
      steps: resolvedSteps,
      runId: args.scenarioRunId,
    });
  }, [
    args.finished,
    args.steps,
    args.slotValues,
    args.onHistoryAppend,
    args.scenarioKey,
    args.scenarioTitle,
    args.scenarioRunId,
  ]);

  return { historyPushedRef };
}
