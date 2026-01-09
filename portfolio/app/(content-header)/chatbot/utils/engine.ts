"use client";

import { useCallback, useRef } from "react";
import type { AnyEdge, AnyNode } from "../types";
import { api } from "@/lib/axios";

// 엔진 로깅 관련
const engineBase = process.env.NEXT_PUBLIC_ENGINE_BASE || "http://localhost:8000";

type LogToEngineParams = {
  nodes: AnyNode[];
  edges: AnyEdge[];
  scenarioKey: string;
  scenarioRunId: string;
  userId: string;
};

type LogPayload = {
  text?: string;
  action?: { type: string; value: any; display?: string };
};

export function useEngineLogger() {
  const engineStateRef = useRef<any>(null);

  const logToEngine = useCallback(async (payload: LogPayload, params: LogToEngineParams) => {
    return;
    const { nodes, edges, scenarioKey, scenarioRunId, userId } = params;

    if (!nodes.length || !edges.length) return;

    try {
      const { data } = await api.post(`${engineBase}/runScenario`, {
          userId,
          scenarioId: scenarioKey,
          nodes,
          edges,
          text: payload.text ?? "",
          state: {
            ...(engineStateRef.current ?? {}),
            runId: scenarioRunId,
            scenarioId: scenarioKey,
          },
          action: payload.action ?? null,
        });
      if (data?.state) engineStateRef.current = data.state;
    } catch {
      // 로깅 실패는 UX에 영향 주면 안됨 → 무시
    }
  }, []);

  const resetEngineState = useCallback(() => {
    engineStateRef.current = null;
  }, []);

  return { logToEngine, resetEngineState };
}
