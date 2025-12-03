// app/(content-header)/chatbot/types/index.ts

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageKind =
  | "llm"          // 일반 LLM 대화
  | "scenario"     // 시나리오 실행 1회 결과(steps 포함)
  | "scenarioSummary"; // (필요하면) 요약용, 지금은 안 써도 됨

// 시나리오 에뮬레이터에서 사용하는 step 구조를 공용으로 빼기
export type ScenarioStep = {
  id: string;
  role: "bot" | "user";
  text: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  kind?: ChatMessageKind;
  scenarioKey?: string;
  scenarioTitle?: string;
  /** 에뮬레이터에서 실제로 돌린 로그 */
  scenarioSteps?: ScenarioStep[];
};

export interface ChatSession {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  messages: ChatMessage[];
}

export type ChatbotDoc = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  systemPrompt: string;
  updatedAt?: string;
};
