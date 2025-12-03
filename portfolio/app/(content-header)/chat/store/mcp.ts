import { create } from 'zustand';
import { McpToolSpec } from '../types/mcp';

type State = {
  connected: boolean;
  tools: McpToolSpec[];
  setConnected: (v: boolean) => void;
  setTools: (ts: McpToolSpec[]) => void;
};

export const useMcp = create<State>((set) => ({
  connected: false,
  tools: [],
  setConnected: (v) => set({ connected: v }),
  setTools: (ts) => set({ tools: ts }),
}));
