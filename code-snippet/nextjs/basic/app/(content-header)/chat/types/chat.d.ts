
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage { 
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number; // Date.now()
}

export interface ChatOptions {
  mode: string; // 'chat' | 'agent';
  model: string; //'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1';
}