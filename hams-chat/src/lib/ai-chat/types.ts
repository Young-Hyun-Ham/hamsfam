// src/lib/ai-chat/types.ts
export type LeftTab = "friends" | "chats" | "more";

export type ChatRoom = {
  id: string;
  title: string;
  lastMessage: string;
  time: string;
  unread: number;
  muted?: boolean;
  pinned?: boolean;
};

export type Friend = {
  id: string;
  name: string;
  status?: string;
};

export type QuickReply = { value: string; display?: string };

export type ChatMessage = {
  id: string;
  role: "me" | "other" | "other-ai";
  text: string;
  time: string;
  meta?: {
    quickReplies?: QuickReply[];
    nodeType?: string;
  };
};

export type Awaiting =
  | { kind: "slot"; nodeId: string; slot: string; next: string }
  | { kind: "branch"; nodeId: string; routes: Record<string, string> };

export type ComposerMenuKey = "chatbot";
