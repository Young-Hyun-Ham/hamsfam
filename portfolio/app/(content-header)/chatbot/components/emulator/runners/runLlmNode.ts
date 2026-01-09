// app/(content-header)/chatbot/components/emulator/runners/runLlmNode.ts
import type { AnyNode, ChatStep } from "../../../types";
import { makeStepId, resolveTemplate } from "../../../utils";

export async function runLlmNode(
  node: AnyNode,
  slotSnapshot: Record<string, any>,
  deps: {
    systemPrompt: string;
    pushBotStep: (id: string, text: string) => void;
    setSteps: React.Dispatch<React.SetStateAction<ChatStep[]>>;
    setSlotValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  },
) {
  const { systemPrompt, pushBotStep, setSteps, setSlotValues } = deps;

  try {
    const rawPrompt: string = node.data?.prompt ?? "";
    const prompt = resolveTemplate(rawPrompt, slotSnapshot);
    const outputVar: string = node.data?.outputVar || "llm_output";

    const res = await fetch("/api/chat/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, systemPrompt }),
    });

    if (!res.ok || !res.body) {
      pushBotStep(makeStepId(`${node.id}-err`), `[LLM 오류] 상태 코드: ${res.status}`);
      return false;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    const stepId = makeStepId(node.id);
    let accumulated = "";

    // 빈 step 먼저 만들고 스트리밍으로 patch
    setSteps((prev) => [...prev, { id: stepId, role: "bot", text: "" }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      const chunkText = decoder.decode(value, { stream: true });
      if (!chunkText) continue;

      accumulated += chunkText;

      setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, text: accumulated } : s)));
    }

    setSlotValues((prev) => ({ ...prev, [outputVar]: accumulated }));
    return true;
  } catch (e) {
    console.error("LLM 노드 실행 오류:", e);
    pushBotStep(makeStepId(`${node.id}-err`), "[LLM 실행 오류가 발생했습니다.]");
    return false;
  }
}
