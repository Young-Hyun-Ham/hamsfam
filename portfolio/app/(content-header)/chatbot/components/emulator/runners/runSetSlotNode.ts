// app/(content-header)/chatbot/components/emulator/runners/runSetSlotNode.ts
import type { AnyNode } from "../../../types";

export function runSetSlotNode(
  node: AnyNode,
  deps: {
    formValues: Record<string, any>;
    setSlotValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  },
) {
  const { formValues, setSlotValues } = deps;

  const assignments: any[] = node.data?.assignments ?? [];
  if (!assignments.length) return;

  setSlotValues((prev) => {
    const next = { ...prev };

    for (const a of assignments) {
      if (!a) continue;

      // 신규 포맷: { key, value }
      if (a.key && a.value !== undefined && !a.slot && !a.from) {
        next[a.key] = a.value;
        continue;
      }

      // 기존 포맷
      if (!a.slot) continue;

      if (a.from === "literal") next[a.slot] = a.value ?? "";
      if (a.from === "form" && a.key) next[a.slot] = formValues[a.key];
      if (a.from === "slot" && a.key) next[a.slot] = prev[a.key];
    }

    return next;
  });
}
