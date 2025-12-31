// app/(content-header)/chatbot/types/index.ts

export type ChatRole = "user" | "assistant" | "system";
export type ChatScenarioStatus = 
  | "linked_suggest"    // 연계: 실행제안
  | "linked_done"       // 연계: 완료(예/아니오 눌러도 완료)
  | "linked_canceled"   // 연계: 취소(원하면 안 씀)
  | "running"           // 실행: 진행중
  | "done"              // 실행: 완료
;

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

// 시나리오 실행 상태(에뮬레이터에서 관리하는 것)
export type ScenarioRunState = {
  scenarioKey: string;
  scenarioTitle?: string;
  steps: ScenarioStep[];
  slotValues: Record<string, any>;
  formValues: Record<string, any>;
  currentNodeId: string | null;
  finished: boolean;
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
  
  scenarioStatus?: ChatScenarioStatus;
};

export interface ChatSession {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  
  // 세션 메타
  lastMessagePreview?: string;
  lastMessageAt?: string;
  messageCount?: number;

  messages: ChatMessage[];
}

export type ChatbotUserDoc = {
  activeSessionId: string | null;
  systemPrompt: string;
  updatedAt?: string;
};

export type ChatbotDoc = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  systemPrompt: string;
  updatedAt?: string;
};
