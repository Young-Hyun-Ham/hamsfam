// app/store/index.ts
'use client';

import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from 'reactflow';
import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from '@/lib/firebase';

import { createNodeData, createFormElement } from '../utils/nodeFactory';
import * as backendService from '../services/backendService';
import * as firebaseApi from '../../../api/builder/firebaseApi';
import { BackendKind } from '../types/types';

/* 1) 노드 타입(키) 고정 */
export type NodeType =
  | 'message' | 'form' | 'branch' | 'slotfilling' | 'api' | 'llm'
  | 'setSlot' | 'delay' | 'fixedmenu' | 'link' | 'toast' | 'iframe' | 'scenario';

/* 2) 색상 맵 타입 */
type ColorMap = Record<NodeType, string>;

/* 3) 기본 색상/텍스트 색상: 키 누락 방지 */
const defaultColors = {
  message: '#f39c12',
  form: '#9b59b6',
  branch: '#2ecc71',
  slotfilling: '#3498db',
  api: '#e74c3c',
  llm: '#1abc9c',
  setSlot: '#8e44ad',
  delay: '#f1c40f',
  fixedmenu: '#e74c3c',
  link: '#34495e',
  toast: '#95a5a6',
  iframe: '#2c3e50',
  scenario: '#7f8c8d',
} satisfies any;

const defaultTextColors = {
  message: '#ffffff',
  form: '#ffffff',
  branch: '#ffffff',
  slotfilling: '#ffffff',
  api: '#ffffff',
  llm: '#ffffff',
  setSlot: '#ffffff',
  delay: '#333333',
  fixedmenu: '#ffffff',
  link: '#ffffff',
  toast: '#ffffff',
  iframe: '#ffffff',
  scenario: '#ffffff',
} satisfies any;

/* 4) 키 배열을 NodeType[]로 고정 */
export const ALL_NODE_TYPES = Object.keys(defaultColors) as NodeType[];

/* 5) 기본 표시 타입 */
const defaultVisibleNodeTypes: NodeType[] = [
  'message','form','branch','slotfilling','api','setSlot','delay',
  'fixedmenu','link','iframe','scenario',
  'llm','toast',
];

/* 6) 공통 유틸: 색상 병합 */
function mergeColors(
  db: Partial<Record<NodeType, string>> | undefined,
  defaults: any
): any {
  const base = db ?? {};
  return ALL_NODE_TYPES.reduce<any>((acc, t) => {
    acc[t] = base[t] ?? defaults[t];
    return acc;
  }, {} as any);
}

/* 7) 스토어 상태/액션 타입 */
type StoreState = {
  backend: BackendKind;

  nodes: Node<any>[];
  edges: Edge<any>[];
  
  setNodes: (newNodes: any[]) => void;
  setEdges: (newEdges: any[]) => void;

  selectedNodeId: string | null;
  anchorNodeId: string | null;
  startNodeId: string | null;

  nodeColors: any;
  nodeTextColors: any;

  // 슬롯/행 등 기존 any 구조는 점진 전환용으로 둠
  slots: Record<string, unknown>;
  selectedRow: unknown;

  visibleNodeTypes: NodeType[];

  setAnchorNodeId: (nodeId: string | null) => void;
  setStartNodeId: (nodeId: string | null) => void;
  setSelectedRow: (row: unknown) => void;
  setSlots: (newSlots: Record<string, unknown>) => void;

  fetchNodeColors: () => Promise<void>;
  fetchNodeTextColors: () => Promise<void>;

  fetchNodeVisibility: () => Promise<void>;
  setNodeVisibility: (nodeType: NodeType, isVisible: boolean) => Promise<void>;

  setNodeColor: (type: NodeType, color: string) => Promise<void>;
  setNodeTextColor: (type: NodeType, color: string) => Promise<void>;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  setSelectedNodeId: (nodeId: string | null) => void;

  deleteNode: (nodeId: string) => void;
  toggleScenarioNode: (nodeId: string) => void;
  deleteSelectedEdges: () => void;

  duplicateNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, dataUpdate: Record<string, unknown>) => void;

  addNode: (type: NodeType, position?: { x: number; y: number }) => void;

  addReply: (nodeId: string) => void;
  updateReply: (nodeId: string, index: number, part: 'display'|'value', value: string) => void;
  deleteReply: (nodeId: string, index: number) => void;

  addElement: (nodeId: string, elementType: string) => void;
  updateElement: (nodeId: string, elementIndex: number, elementUpdate: Record<string, any>) => void;
  deleteElement: (nodeId: string, elementIndex: number) => void;
  updateGridCell: (nodeId: string, elementIndex: number, rowIndex: number, colIndex: number, value: string) => void;
  moveElement: (nodeId: string, startIndex: number, endIndex: number) => void;

  exportSelectedNodes: (selectedNodes: Node<any>[]) => void;
  importNodes: () => Promise<void>;

  addScenarioAsGroup: (
    backend: any,
    scenario: { id: string; name: string },
    position?: { x: number; y: number }
  ) => Promise<void>;

  fetchScenario: (backend: any, scenarioId: string) => Promise<void>;
  saveScenario: (backend: any, scenario: { id: string; name: string }) => Promise<void>;
};

/* 8) Zustand 제네릭으로 상태 안전화 */
const useBuilderStore = create<StoreState>((set, get) => ({
  backend: 'firebase',

  nodes: [],
  edges: [],

  // 전체 노드 교체용
  setNodes: (newNodes: any[]) => {
    set({ nodes: newNodes });
  },

  // 전체 엣지 교체용
  setEdges: (newEdges: any[]) => {
    set({ edges: newEdges });
  },

  selectedNodeId: null,
  anchorNodeId: null,
  startNodeId: null,
  nodeColors: defaultColors,
  nodeTextColors: defaultTextColors,
  slots: {},
  selectedRow: null,

  visibleNodeTypes: defaultVisibleNodeTypes,

  setAnchorNodeId: (nodeId) =>
    set((state) => ({ anchorNodeId: state.anchorNodeId === nodeId ? null : nodeId })),

  setStartNodeId: (nodeId) =>
    set((state) => ({ startNodeId: state.startNodeId === nodeId ? null : nodeId })),

  setSelectedRow: (row) => set({ selectedRow: row }),
  setSlots: (newSlots) => set({ slots: newSlots }),

  fetchNodeColors: async () => {
    const docRef = doc(db, "settings", "nodeColors");
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const dbColors = snap.data() as Partial<Record<NodeType, string>>;
        set({ nodeColors: mergeColors(dbColors, defaultColors) });
      } else {
        await setDoc(docRef, defaultColors);
        set({ nodeColors: defaultColors });
      }
    } catch (e) {
      console.error("Failed to fetch node colors from DB", e);
    }
  },

  fetchNodeTextColors: async () => {
    const docRef = doc(db, "settings", "nodeTextColors");
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const dbTextColors = snap.data() as Partial<Record<NodeType, string>>;
        set({ nodeTextColors: mergeColors(dbTextColors, defaultTextColors) });
      } else {
        await setDoc(docRef, defaultTextColors);
        set({ nodeTextColors: defaultTextColors });
      }
    } catch (e) {
      console.error("Failed to fetch node text colors from DB", e);
    }
  },

  fetchNodeVisibility: async () => {
    try {
      const settings = await firebaseApi.fetchNodeVisibility();
      if (settings && Array.isArray(settings.visibleNodeTypes)) {
        // 런타임 배열을 NodeType[]로 안전 캐스팅 (검증 가능하면 더 좋음)
        set({ visibleNodeTypes: settings.visibleNodeTypes as NodeType[] });
      } else {
        await firebaseApi.saveNodeVisibility(defaultVisibleNodeTypes);
        set({ visibleNodeTypes: defaultVisibleNodeTypes });
      }
    } catch (e) {
      console.error("Failed to fetch node visibility:", e);
      set({ visibleNodeTypes: defaultVisibleNodeTypes });
    }
  },

  setNodeVisibility: async (nodeType, isVisible) => {
    const current = get().visibleNodeTypes;
    const s = new Set(current);
    isVisible ? s.add(nodeType) : s.delete(nodeType);
    const next = Array.from(s) as NodeType[];
    set({ visibleNodeTypes: next });
    try {
      await firebaseApi.saveNodeVisibility(next);
    } catch (e) {
      console.error("Failed to save node visibility:", e);
    }
  },

  setNodeColor: async (type, color) => {
    const newColors: any = { ...get().nodeColors, [type]: color };
    set({ nodeColors: newColors });
    try {
      await setDoc(doc(db, "settings", "nodeColors"), newColors);
    } catch (e) {
      console.error("Failed to save node colors to DB", e);
    }
  },

  setNodeTextColor: async (type, color) => {
    const newColors: any = { ...get().nodeTextColors, [type]: color };
    set({ nodeTextColors: newColors });
    try {
      await setDoc(doc(db, "settings", "nodeTextColors"), newColors);
    } catch (e) {
      console.error("Failed to save node text colors to DB", e);
    }
  },

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),

  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

  deleteNode: (nodeId) => {
    set((state) => {
      const nodeToDelete = state.nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return state;

      const nodesToRemove: string[] = [nodeId];
      if (nodeToDelete.type === 'scenario') {
        state.nodes
          .filter((n) => n.parentNode === nodeId)
          .forEach((child) => nodesToRemove.push(child.id));
      }

      const removeSet = new Set(nodesToRemove);
      const remainingNodes = state.nodes.filter((n) => !removeSet.has(n.id));
      const remainingEdges = state.edges.filter(
        (e) => !removeSet.has(e.source) && !removeSet.has(e.target)
      );

      return {
        nodes: remainingNodes,
        edges: remainingEdges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        startNodeId: state.startNodeId === nodeId ? null : state.startNodeId,
      };
    });
  },

  toggleScenarioNode: (nodeId) => {
    set((state) => {
      const PADDING = 40;
      const newNodes = state.nodes.map((n) => {
        if (n.id === nodeId && n.type === 'scenario') {
          const isCollapsed = !(n.data?.isCollapsed ?? false);
          const nextStyle: Record<string, any> = { ...(n.style as any) };

          if (isCollapsed) {
            nextStyle.width = 250; nextStyle.height = 50;
          } else {
            const children = state.nodes.filter((c) => c.parentNode === nodeId);
            if (children.length) {
              let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
              children.forEach((c) => {
                const x = c.position.x, y = c.position.y;
                const w = (c.width as number) || 250;
                const h = (c.height as number) || 150;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + w);
                maxY = Math.max(maxY, y + h);
              });
              nextStyle.width = (maxX - minX) + PADDING * 2;
              nextStyle.height = (maxY - minY) + PADDING * 2;

              children.forEach((c) => {
                c.position.x -= (minX - PADDING);
                c.position.y -= (minY - PADDING);
              });
            } else {
              nextStyle.width = 250; nextStyle.height = 100;
            }
          }
          return { ...n, style: nextStyle, data: { ...n.data, isCollapsed } };
        }
        return n;
      });
      return { nodes: newNodes };
    });
  },

  deleteSelectedEdges: () =>
    set((state) => ({ edges: state.edges.filter((e) => !e.selected) })),

  duplicateNode: (nodeId) => {
    const { nodes } = get();
    const original = nodes.find((n) => n.id === nodeId);
    if (!original) return;

    const maxZ = nodes.reduce((m, n) => Math.max((n.zIndex as number) || 0, m), 0);
    const newData = JSON.parse(JSON.stringify(original.data ?? {}));
    const newNode: Node<any> = {
      ...original,
      id: `${original.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      position: { x: original.position.x + 50, y: original.position.y + 50 },
      data: newData,
      selected: false,
      zIndex: (maxZ + 1) as any,
    };
    set({ nodes: [...nodes, newNode] });
    get().setSelectedNodeId(newNode.id);
  },

  updateNodeData: (nodeId, dataUpdate) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...(n.data ?? {}), ...dataUpdate } } : n
      ),
    }));
  },

  addNode: (type, position = { x: 100, y: 100 }) => {
    const data = createNodeData(type);
    const newNode: Node<any> = { id: data.id, type, position, data };
    set({ nodes: [...get().nodes, newNode] });
  },

  /* 이하 폼/리플라이 관련 로직은 원본 유지, 파라미터만 타입 지정 */
  addReply: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const t = n.type as NodeType;
        const label = t === 'branch' ? 'New Condition' : t === 'fixedmenu' ? 'New Menu' : 'New Reply';
        const prefix = t === 'branch' ? 'cond' : t === 'fixedmenu' ? 'menu' : 'val';
        const newReply = { display: label, value: `${prefix}_${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
        const replies = Array.isArray(n.data?.replies) ? n.data!.replies : [];
        return { ...n, data: { ...(n.data ?? {}), replies: [...replies, newReply] } };
      }),
    }));
  },

  updateReply: (nodeId, index, part, value) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const replies = Array.isArray(n.data?.replies) ? [...n.data!.replies] : [];
        if (!replies[index]) return n;
        replies[index] = { ...replies[index], [part]: value };
        return { ...n, data: { ...(n.data ?? {}), replies } };
      }),
    }));
  },

  deleteReply: (nodeId, index) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const replies = Array.isArray(n.data?.replies) ? n.data!.replies.filter((_: any, i: number) => i !== index) : [];
        return { ...n, data: { ...(n.data ?? {}), replies } };
      }),
    }));
  },

  addElement: (nodeId, elementType) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId || n.type !== 'form') return n;
        const el = createFormElement(elementType);
        const elements = Array.isArray(n.data?.elements) ? n.data!.elements : [];
        return { ...n, data: { ...(n.data ?? {}), elements: [...elements, el] } };
      }),
    }));
  },

  updateElement: (nodeId, elementIndex, elementUpdate) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId || n.type !== 'form') return n;
        const elements = Array.isArray(n.data?.elements) ? [...n.data!.elements] : [];
        const oldEl = elements[elementIndex];
        if (!oldEl) return n;
        const nextEl = { ...oldEl, ...elementUpdate };

        if (nextEl.type === 'grid' && (oldEl.rows !== nextEl.rows || oldEl.columns !== nextEl.columns)) {
          const oldData: string[] = oldEl.data || [];
          const newRows = nextEl.rows || 2;
          const newCols = nextEl.columns || 2;
          const newData = Array(newRows * newCols).fill('');
          for (let r = 0; r < Math.min(oldEl.rows || 0, newRows); r++) {
            for (let c = 0; c < Math.min(oldEl.columns || 0, newCols); c++) {
              const oi = r * (oldEl.columns || 0) + c;
              const ni = r * newCols + c;
              if (oldData[oi] !== undefined) newData[ni] = oldData[oi];
            }
          }
          nextEl.data = newData;
        }

        elements[elementIndex] = nextEl;
        return { ...n, data: { ...(n.data ?? {}), elements } };
      }),
    }));
  },

  deleteElement: (nodeId, elementIndex) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId || n.type !== 'form') return n;
        const elements = Array.isArray(n.data?.elements)
          ? n.data!.elements.filter((_: any, i: number) => i !== elementIndex)
          : [];
        return { ...n, data: { ...(n.data ?? {}), elements } };
      }),
    }));
  },

  updateGridCell: (nodeId, elementIndex, rowIndex, colIndex, value) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId || n.type !== 'form') return n;
        const elements = JSON.parse(JSON.stringify(n.data?.elements ?? []));
        const grid = elements[elementIndex];
        if (!grid || grid.type !== 'grid') return n;
        const idx = rowIndex * grid.columns + colIndex;
        grid.data[idx] = value;
        return { ...n, data: { ...(n.data ?? {}), elements } };
      }),
    }));
  },

  moveElement: (nodeId, startIndex, endIndex) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId || n.type !== 'form') return n;
        const elements = Array.isArray(n.data?.elements) ? [...n.data!.elements] : [];
        const [removed] = elements.splice(startIndex, 1);
        elements.splice(endIndex, 0, removed);
        return { ...n, data: { ...(n.data ?? {}), elements } };
      }),
    }));
  },

  exportSelectedNodes: (selectedNodes) => {
    const { edges } = get();
    const ids = new Set(selectedNodes.map((n) => n.id));
    const relevantEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const json = JSON.stringify({ nodes: selectedNodes, edges: relevantEdges }, null, 2);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(json)
        .then(() => alert(`${selectedNodes.length} nodes exported to clipboard!`))
        .catch((err) => {
          console.error('Clipboard API failed: ', err);
          alert(`Failed to export nodes: ${err.message}`);
        });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = json; ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        alert(`${selectedNodes.length} nodes exported to clipboard (fallback).`);
      } catch (err) {
        console.error('Fallback export failed: ', err);
        alert('Failed to export nodes.');
      }
    }
  },

  importNodes: async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) throw new Error('Invalid data format');

      const { nodes: curNodes, edges: curEdges } = get();
      const map = new Map<string, string>();

      const newNodes: Node<any>[] = parsed.nodes.map((node: Node<any>, i: number) => {
        const oldId = node.id;
        const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${i}`;
        map.set(oldId, newId);
        return { ...node, id: newId, position: { x: node.position.x + 20, y: node.position.y + 20 }, selected: false };
      });

      const newEdges: Edge<any>[] = (parsed.edges ?? [])
        .map((e: Edge<any>) => {
          const s = map.get(e.source);
          const t = map.get(e.target);
          if (s && t) {
            return {
              ...e,
              id: `reactflow__edge-${s}${e.sourceHandle || ''}-${t}${e.targetHandle || ''}`,
              source: s, target: t,
            };
          }
          return null;
        })
        .filter(Boolean) as Edge<any>[];

      set({ nodes: [...curNodes, ...newNodes], edges: [...curEdges, ...newEdges] });
      alert(`${newNodes.length} nodes imported successfully!`);
    } catch (err) {
      console.error('Failed to import nodes: ', err);
      alert('Failed to import nodes from clipboard.');
    }
  },

  addScenarioAsGroup: async (backend, scenario, position) => {
    const { nodes: curNodes, edges: curEdges } = get();
    const data = await backendService.fetchScenarioData(backend, { scenarioId: scenario.id });
    if (!data?.nodes?.length) {
      alert(`Failed to load scenario data for '${scenario.name}' or it is empty.`);
      return;
    }

    const PADDING = 40;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    data.nodes.forEach((n: Node<any>) => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      const w = (n.width as number) || 250;
      const h = (n.height as number) || 150;
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    });

    const groupPos = position ?? { x: minX, y: minY };
    const groupW = (maxX - minX) + PADDING * 2;
    const groupH = (maxY - minY) + PADDING * 2;

    const idPrefix = `group-${scenario.id}-${Date.now()}`;
    const groupId = `group-${idPrefix}`;
    const map = new Map<string, string>();

    const childNodes: Node<any>[] = data.nodes.map((n: Node<any>) => {
      const newId = `${idPrefix}-${n.id}`;
      map.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x - minX + PADDING, y: n.position.y - minY + PADDING },
        parentNode: groupId,
        extent: 'parent',
      };
    });

    const groupNode: Node<any> = {
      id: groupId,
      type: 'scenario',
      position: groupPos,
      data: { label: scenario.name, scenarioId: scenario.id, isCollapsed: false },
      style: { width: groupW, height: groupH },
    };

    const newEdges: Edge<any>[] = (data.edges ?? []).map((e: Edge<any>) => ({
      ...e,
      id: `${idPrefix}-${e.id}`,
      source: map.get(e.source)!,
      target: map.get(e.target)!,
    }));

    set({ nodes: [...curNodes, groupNode, ...childNodes], edges: [...curEdges, ...newEdges] });
  },

  fetchScenario: async (backend, scenarioId) => {
    try {
      const data = await backendService.fetchScenarioData(backend, { scenarioId });
      set({
        nodes: (data.nodes ?? []) as Node<any>[],
        edges: (data.edges ?? []) as Edge<any>[],
        selectedNodeId: null,
        startNodeId: (data.startNodeId ?? null) as string | null,
      });
    } catch (e) {
      console.error("Error fetching scenario:", e);
      alert('Failed to load scenario details.');
      set({ nodes: [], edges: [], selectedNodeId: null, startNodeId: null });
    }
  },

  saveScenario: async (backend, scenario) => {
    try {
      const { nodes, edges, startNodeId } = get();
      await backendService.saveScenarioData(backend, { scenario, data: { nodes, edges, startNodeId } });
      alert(`Scenario '${scenario.name}' has been saved successfully!`);
    } catch (e: any) {
      console.error("Error saving scenario:", e);
      alert(`Failed to save scenario: ${e?.message ?? 'unknown error'}`);
    }
  },
}));

export default useBuilderStore;
