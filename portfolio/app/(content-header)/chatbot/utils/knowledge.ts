// app/(content-header)/chatbot/utils/knowledge.ts
import { api } from "@/lib/axios";

export type KnowledgeAnswer = any;

export function getGeminiPrefix(ans: KnowledgeAnswer) {
  const intentsCount = Number(ans?.debug?.intentsCount ?? 0);
  const hasAnyIntent = intentsCount > 0;
  const matchedIntent = ans?.intent != null;

  if (!hasAnyIntent) {
    return "지식 데이터(인텐트)가 아직 준비되지 않았습니다.\n일반 답변으로 진행합니다.\n\n";
  }
  if (!matchedIntent) {
    return "등록된 의도에 해당하는 답변을 찾지 못해 일반 답변으로 진행합니다.\n\n";
  }

  const hasAnswer = Boolean(ans?.answer);
  const hasScenario = Boolean(ans?.scenario?.scenarioKey);
  if (!hasAnswer && !hasScenario) {
    return "해당 의도에 연결된 답변/시나리오가 아직 없습니다.\n일반 답변으로 진행합니다.\n\n";
  }

  return "";
}

export async function fetchKnowledgeAnswer(params: {
  text: string;
  systemPrompt: string;
  locale?: string;
  mode?: "plan" | "full";
}) {
  const backend = (process.env.NEXT_PUBLIC_BACKEND ?? "firebase").toLowerCase();
  const answerUrl = `/api/chatbot/${backend}/answer`;

  const projectId =
    process.env.NEXT_PUBLIC_KNOWLEDGE_PROJECT_ID ||
    "81ba67f6-7568-446a-a82e-d0d7473ce437";

  const payload = {
    projectId,
    text: params.text,
    locale: params.locale ?? "ko",
    mode: params.mode ?? "plan",
    systemPrompt: params.systemPrompt,
  };

  const { data } = await api.post(answerUrl, payload);
  return data as KnowledgeAnswer;
}
