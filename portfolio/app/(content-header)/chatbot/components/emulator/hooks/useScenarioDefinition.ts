// app/(content-header)/chatbot/components/emulator/hooks/useScenarioDefinition.ts
"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import * as builderBackendService from "../../../../builder/services/backendService";
import type { AnyEdge, AnyNode } from "../../../types";

export function useScenarioDefinition(scenarioKey: string) {
  const backend = useStore((s: any) => s.backend);

  const [nodes, setNodes] = useState<AnyNode[]>([]);
  const [edges, setEdges] = useState<AnyEdge[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchScenarioData = async () => {
      const data = await builderBackendService.fetchScenarioData(backend, {
        scenarioId: scenarioKey,
      });
      if (!mounted) return;
      setNodes(data.nodes);
      setEdges(data.edges);
    };

    fetchScenarioData();

    return () => {
      mounted = false;
    };
  }, [backend, scenarioKey]);

  return { nodes, edges };
}
