// app/(content-header)/chatbot/components/emulator/hooks/useScenarioHydration.ts
"use client";

import { useEffect, useRef } from "react";
import type { AnyNode, ChatStep } from "../../../types";

type PersistedRun = {
  currentNodeId?: string | null;
  steps?: ChatStep[];
  slotValues?: Record<string, any>;
  formValues?: Record<string, any>;
  finished?: boolean;
} | undefined;

export function useScenarioHydration(args: {
  nodesReady: boolean;
  rootNode: AnyNode | null;

  persistedRun: PersistedRun;

  initialSteps?: ChatStep[];
  initialFinished?: boolean;
  initialCurrentNodeId?: string | null;
  initialSlotValues?: Record<string, any>;
  initialFormValues?: Record<string, any>;

  // setters
  setCurrentNodeId: (v: string | null) => void;
  setSteps: (v: ChatStep[]) => void;
  setSlotValues: (v: Record<string, any>) => void;
  setFormValues: (v: Record<string, any>) => void;
  setFinished: (v: boolean) => void;
}) {
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (!args.nodesReady) return;
    if (didHydrateRef.current) return;

    const restoreNodeId =
      args.persistedRun?.currentNodeId ??
      args.initialCurrentNodeId ??
      args.rootNode?.id ??
      null;

    args.setCurrentNodeId(restoreNodeId);

    if (args.persistedRun) {
      args.setSteps(args.persistedRun.steps ?? []);
      args.setSlotValues(args.persistedRun.slotValues ?? {});
      args.setFormValues(args.persistedRun.formValues ?? {});
      args.setFinished(Boolean(args.persistedRun.finished));
    } else {
      args.setSteps(args.initialSteps ?? []);
      args.setSlotValues(args.initialSlotValues ?? {});
      args.setFormValues(args.initialFormValues ?? {});
      args.setFinished(Boolean(args.initialFinished ?? false));
    }

    didHydrateRef.current = true;
  }, [
    args.nodesReady,
    args.rootNode?.id,
    args.persistedRun,
    args.initialCurrentNodeId,
    args.initialSteps,
    args.initialSlotValues,
    args.initialFormValues,
    args.initialFinished,
  ]);

  return { didHydrateRef };
}
