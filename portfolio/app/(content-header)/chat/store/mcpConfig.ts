/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Mcp, McpConfig } from '../types/mcp';
import { api } from '@/lib/axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  mcpInfo: Mcp;
  mcpList: McpConfig[];
  selectedId?: string;
  addMcp: (c: McpConfig) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<McpConfig>) => void;
  setSelected: (id?: string) => void;
  
  /** 서버 데이터로 통째로 교체 */
  setAll: (items: Mcp, preferredId?: string, activeId?: string) => void;

  /** /api/mcp GET → 스토어 동기화 */
  refreshFromServer: () => Promise<void>;
};

export const useMcpConfig = create<State>()(
  persist(
    (set, get) => ({
      mcpInfo: {
        id: "",
        user_id: "",
        mcp_data: [{
          id: "",
          name: "",
          type: null,
        }],
        use_yn: true,
      },
      // 기존 항목이 있더라도 migrate에서 type 보정됨
      mcpList: [
        // { id: 'mcp111', name: 'mcp111', type: 'websocket', url: 'ws://localhost:8080', createdAt: Date.now(), status: "error", statusMessage: "connection error" }
      ],
      selectedId: undefined,
      addMcp: (c) => {
        if (!get().mcpList) {
          set({ mcpList: [c], selectedId: c.id });
        } else {
          // const exists = get().mcpList.some(x => x.id === c.id);
          // if (exists) throw new Error(`이미 존재하는 MCP ID: ${c.id}`);
          set({ mcpList: [...get().mcpList, c], selectedId: c.id });
        }
      },
      remove: (id) => {
        set({ mcpList: get().mcpList.filter(x => x.id !== id), selectedId: get().mcpList[0].id })
      },
      update: (id, patch) => set({
        mcpList: get().mcpList.map(x => (x.id === id ? { ...x, ...patch } : x))
      }),
      setSelected: (id) => set({ selectedId: id }),

      /** 서버 데이터로 전체 교체 + 선택 우선순위: preferredId > activeId > 첫 번째 */
      setAll: (item, preferredId, activeId) => {
        if (!item) return ;
        if (!item.mcp_data) return ;

        let parsedMcpData: McpConfig[];
        if (typeof item.mcp_data === 'string') {
          parsedMcpData = JSON.parse(item.mcp_data) as McpConfig[];
        } else if (item.mcp_data && typeof item.mcp_data === 'object') {
          parsedMcpData = item.mcp_data as McpConfig[];
        } else {
          throw new Error('유효하지 않은 mcp_data 형식입니다.');
        }
        
        let selected: string | undefined = preferredId;
        if (!selected && activeId && parsedMcpData.some(x => x.id === activeId)) selected = activeId;
        if (!selected) selected = item.mcp_data[0]?.id;

        // mcp mcpList의 첫번쨰 id
        selected = item.mcp_data[0]?.id;
        set({mcpInfo: item, mcpList: parsedMcpData, selectedId: selected });
      },

      /** /api/mcp → 목록 동기화 */
      refreshFromServer: async () => {
        try {
          const res = await api.get('/api/mcp', {
            params: { withStatus: 1 }, withCredentials: true
          });
          // 서버는 { items: [...] } 형태로 반환 (각 item에 status/statusMessage 포함)
          const data = res.data as { item: Mcp };
          const item: Mcp = data.item;
          const preferred = get().selectedId;
          if (item) get().setAll(item, preferred);
        } catch (e) {
          throw e;
        }
      },
    }),
    { name: 'mcp-config-v3' }
  )
);
