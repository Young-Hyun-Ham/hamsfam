// app/(content-header)/chatbot/components/emulator/core/graph.ts
import type { AnyEdge, AnyNode } from "../../../types";

/** 루트 노드 찾기 */
export function findRootNode(nodes: AnyNode[], edges: AnyEdge[]): AnyNode | null {
  const targets = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targets.has(n.id)) ?? null;
}

/** 다음 노드 찾기 */
export function findNextNode(
  nodes: AnyNode[],
  edges: AnyEdge[],
  currentId: string,
  handle?: string | null,
): AnyNode | null {
  const candidates = edges.filter((e) => e.source === currentId);
  if (!candidates.length) return null;

  if (handle) {
    const matched = candidates.find((e) => e.sourceHandle === handle);
    if (matched) return nodes.find((n) => n.id === matched.target) ?? null;
  }

  const first = candidates[0];
  return nodes.find((n) => n.id === first.target) ?? null;
}
