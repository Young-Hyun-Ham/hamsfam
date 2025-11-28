// app/(content-header)/chatbot/types/index.ts

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  messages: ChatMessage[];
}
