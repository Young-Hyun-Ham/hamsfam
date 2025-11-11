import { create } from "zustand";

type ChatState = {
  mode: string; // 'chat' | 'agent';
  model: string; //'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1';
  mcp: string;
};

export const useChat = create<ChatState>((set) => ({
  mode: "chat",
  model: "gpt-4o-mini",
  mcp: "",
}));