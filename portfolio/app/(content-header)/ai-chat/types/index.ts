// app/(content-header)/ai-chat/types/index.ts
export type ChatRole = "me" | "other" | "other-ai";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  time: string;
  meta?: {
    nodeType?: string;
    quickReplies?: Array<{ value: string; display?: string }>;
  };
};
