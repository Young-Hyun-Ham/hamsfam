// app/(content-header)/builder/store/slice/nodeSlice.ts

import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { createNodeData, createFormElement } from '../../utils/nodeFactory';
import { fetchScenarioData, saveScenarioData } from '../../services/backendService';

const defaultColors = {
  message: '#f39c12',
  form: '#9b59b6',
  branch: '#2ecc71',
  slotfilling: '#3498db',
  api: '#e74c3c',
  fixedmenu: '#e74c3c',
  link: '#34495e',
  llm: '#1abc9c',
  toast: '#95a5a6',
  iframe: '#596d82ff',
  scenario: '#7f8c8d',
};

const defaultTextColors = {
  message: '#ffffff',
  form: '#ffffff',
  branch: '#ffffff',
  slotfilling: '#ffffff',
  api: '#ffffff',
  fixedmenu: '#ffffff',
  link: '#ffffff',
  llm: '#ffffff',
  toast: '#ffffff',
}

// 💡 [추가] 기본적으로 표시할 노드 타입 리스트
const defaultVisibleNodeTypes = [
  'message',
  'form',
  'branch',
  'slotfilling',
  'api',
  'setSlot',
  'delay',
  'fixedmenu',
  'link',
  'iframe',
  'scenario',
  // 'llm', // 기본 숨김
  // 'toast', // 기본 숨김
];

export const nodeSlice = (set: any, get: any) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  anchorNodeId: null,
  startNodeId: null,
  nodeColors: defaultColors,
  nodeTextColors: defaultTextColors,
  slots: {},
  selectedRow: null,
  
  // 노드 표시 여부 상태
  visibleNodeTypes: defaultVisibleNodeTypes,

  setAnchorNodeId: (nodeId: any) => {
    set((state: any) => ({
      anchorNodeId: state.anchorNodeId === nodeId ? null : nodeId,
    }));
  },

  // <<< [수정] 시작 노드 설정 함수 >>>
  setStartNodeId: (nodeId: any) => {
    set((state: any) => {
      // 이미 시작 노드이면 null로 설정 (토글 방식)
      if (state.startNodeId === nodeId) {
        return { startNodeId: null };
      }
      return { startNodeId: nodeId };
    });
  },
  // <<< [수정 끝] >>>

  setSelectedRow: (row: any) => set({ selectedRow: row }), // <<< [추가] selectedRow 업데이트 함수

  setSlots: (newSlots: any) => set({ slots: newSlots }),

  fetchNodeColors: async () => {
    const docRef = doc(db, "settings", "nodeColors");
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const dbColors = docSnap.data();
        set({ nodeColors: { ...defaultColors, ...dbColors } });
      } else {
        await setDoc(docRef, defaultColors);
      }
    } catch (error) {
      console.error("Failed to fetch node colors from DB", error);
    }
  },

  fetchNodeTextColors: async () => {
    const docRef = doc(db, "settings", "nodeTextColors");
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const dbTextColors = docSnap.data();
        set({ nodeTextColors: { ...defaultTextColors, ...dbTextColors } });
      } else {
        await setDoc(docRef, defaultTextColors);
      }
    } catch (error) {
      console.error("Failed to fetch node text colors from DB", error);
    }
  },

  setNodeColor: async (type: any, color: any) => {
    const newColors = { ...get().nodeColors, [type]: color };
    set({ nodeColors: newColors });
    try {
      const docRef = doc(db, "settings", "nodeColors");
      await setDoc(docRef, newColors);
    } catch (error) {
      console.error("Failed to save node colors to DB", error);
    }
  },

  setNodeTextColor: async (type: any, color: any) => {
    const newTextColors = { ...get().nodeTextColors, [type]: color };
    set({ nodeTextColors: newTextColors });
    try {
      const docRef = doc(db, "settings", "nodeTextColors");
      await setDoc(docRef, newTextColors);
    } catch (error) {
      console.error("Failed to save node text colors to DB", error);
    }
  },

  onNodesChange: (changes: any) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes: any) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection: any) => set({ edges: addEdge(connection, get().edges) }),

  setSelectedNodeId: (nodeId: any) => set({ selectedNodeId: nodeId }),

  deleteNode: (nodeId: any) => {
    set((state: any) => {
      const nodeToDelete = state.nodes.find((n: any) => n.id === nodeId);
      if (!nodeToDelete) return state;

      let nodesToRemove = [nodeId];
      if (nodeToDelete.type === 'scenario') {
        const childNodes = state.nodes.filter((n: any) => n.parentNode === nodeId);
        childNodes.forEach((child: any) => nodesToRemove.push(child.id));
      }

      const nodesToRemoveSet = new Set(nodesToRemove);
      const remainingNodes = state.nodes.filter((n: any) => !nodesToRemoveSet.has(n.id));
      const remainingEdges = state.edges.filter((e: any) => !nodesToRemoveSet.has(e.source) && !nodesToRemoveSet.has(e.target));

      // <<< [수정] 삭제되는 노드가 시작 노드이면 startNodeId 초기화 >>>
      const newStartNodeId = state.startNodeId === nodeId ? null : state.startNodeId;

      return {
        nodes: remainingNodes,
        edges: remainingEdges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        startNodeId: newStartNodeId, // <<< [수정]
      };
    });
  },

  toggleScenarioNode: (nodeId: any) => {
    set((state: any) => {
      const newNodes = state.nodes.map((n: any) => {
        if (n.id === nodeId && n.type === 'scenario') {
          const isCollapsed = !(n.data.isCollapsed || false);
          let newStyle = { ...n.style };

          if (isCollapsed) {
            newStyle.width = 250;
            newStyle.height = 50;
          } else {
            const PADDING = 40;
            const childNodes = state.nodes.filter((child: any) => child.parentNode === nodeId);
            if (childNodes.length > 0) {
              let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
              childNodes.forEach((node: any) => {
                const x = node.position.x;
                const y = node.position.y;
                const nodeWidth = node.width || 250;
                const nodeHeight = node.height || 150;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + nodeWidth);
                maxY = Math.max(maxY, y + nodeHeight);
              });

              newStyle.width = (maxX - minX) + PADDING * 2;
              newStyle.height = (maxY - minY) + PADDING * 2;

              // Ensure child nodes are repositioned if they are outside the new bounds
              childNodes.forEach((node: any) => {
                node.position.x -= (minX - PADDING);
                node.position.y -= (minY - PADDING);
              });

            } else {
              newStyle.width = 250;
              newStyle.height = 100;
            }
          }

          return {
            ...n,
            style: newStyle,
            data: { ...n.data, isCollapsed },
          };
        }
        return n;
      });
      return { nodes: newNodes };
    });
  },

  deleteSelectedEdges: () => {
    set((state: any) => ({
      edges: state.edges.filter((edge: any) => !edge.selected),
    }));
  },

  duplicateNode: (nodeId: any) => {
    const { nodes } = get();
    const originalNode = nodes.find((node: any) => node.id === nodeId);
    if (!originalNode) return;

    const maxZIndex = nodes.reduce((max: any, node: any) => Math.max(node.zIndex || 0, max), 0);
    const newData = JSON.parse(JSON.stringify(originalNode.data));

    const newNode = {
      ...originalNode,
      id: `${originalNode.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      position: { x: originalNode.position.x + 50, y: originalNode.position.y + 50 },
      data: newData,
      selected: false,
      zIndex: maxZIndex + 1,
    };

    set({ nodes: [...nodes, newNode] });
    get().setSelectedNodeId(newNode.id);
  },

  updateNodeData: (nodeId: any, dataUpdate: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...dataUpdate } } : node
      ),
    }));
  },

  addNode: (type: any, position = { x: 100, y: 100 }) => {
    const newNodeData = createNodeData(type);
    const newNode = {
      id: newNodeData.id,
      type,
      position,
      data: newNodeData,
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // --- 👇 Functions from previous development ---
  addReply: (nodeId: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId) {
          const nodeType = node.type;
          const newReply = {
            display: nodeType === 'branch' ? 'New Condition' : (nodeType === 'fixedmenu' ? 'New Menu' : 'New Reply'),
            value: `${nodeType === 'branch' ? 'cond' : (nodeType === 'fixedmenu' ? 'menu' : 'val')}_${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          };
          const newReplies = [...(node.data.replies || []), newReply];
          return { ...node, data: { ...node.data, replies: newReplies } };
        }
        return node;
      }),
    }));
  },

  updateReply: (nodeId: any, index: any, part: any, value: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId) {
          const newReplies = [...node.data.replies];
          newReplies[index] = { ...newReplies[index], [part]: value };
          return { ...node, data: { ...node.data, replies: newReplies } };
        }
        return node;
      }),
    }));
  },

  deleteReply: (nodeId: any, index: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId) {
          const newReplies = node.data.replies.filter((_: any, i: any) => i !== index);
          return { ...node, data: { ...node.data, replies: newReplies } };
        }
        return node;
      }),
    }));
  },

  addElement: (nodeId: any, elementType: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId && node.type === 'form') {
          const newElement = createFormElement(elementType);
          const newElements = [...(node.data.elements || []), newElement];
          return { ...node, data: { ...node.data, elements: newElements } };
        }
        return node;
      }),
    }));
  },

  updateElement: (nodeId: any, elementIndex: any, elementUpdate: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId && node.type === 'form') {
          const newElements = [...node.data.elements];
          const oldElement = newElements[elementIndex];
          const newElement = { ...oldElement, ...elementUpdate };

          if (newElement.type === 'grid' && (oldElement.rows !== newElement.rows || oldElement.columns !== newElement.columns)) {
            const oldData = oldElement.data || [];
            const newRows = newElement.rows || 2;
            const newColumns = newElement.columns || 2;
            const newData = Array(newRows * newColumns).fill('');

            for (let r = 0; r < Math.min(oldElement.rows || 0, newRows); r++) {
              for (let c = 0; c < Math.min(oldElement.columns || 0, newColumns); c++) {
                const oldIndex = r * (oldElement.columns || 0) + c;
                const newIndex = r * newColumns + c;
                if (oldData[oldIndex] !== undefined) {
                  newData[newIndex] = oldData[oldIndex];
                }
              }
            }
            newElement.data = newData;
          }

          newElements[elementIndex] = newElement;
          return { ...node, data: { ...node.data, elements: newElements } };
        }
        return node;
      }),
    }));
  },

  deleteElement: (nodeId: any, elementIndex: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId && node.type === 'form') {
          const newElements = node.data.elements.filter((_: any, i: any) => i !== elementIndex);
          return { ...node, data: { ...node.data, elements: newElements } };
        }
        return node;
      }),
    }));
  },

  updateGridCell: (nodeId: any, elementIndex: any, rowIndex: any, colIndex: any, value: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId && node.type === 'form') {
          const newElements = JSON.parse(JSON.stringify(node.data.elements));
          const gridElement = newElements[elementIndex];

          if (gridElement && gridElement.type === 'grid') {
            const index = rowIndex * gridElement.columns + colIndex;
            gridElement.data[index] = value;
            return { ...node, data: { ...node.data, elements: newElements } };
          }
        }
        return node;
      }),
    }));
  },

  moveElement: (nodeId: any, startIndex: any, endIndex: any) => {
    set((state: any) => ({
      nodes: state.nodes.map((node: any) => {
        if (node.id === nodeId && node.type === 'form') {
          const newElements = [...node.data.elements];
          const [removed] = newElements.splice(startIndex, 1);
          newElements.splice(endIndex, 0, removed);
          return { ...node, data: { ...node.data, elements: newElements } };
        }
        return node;
      }),
    }));
  },

  exportSelectedNodes: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((n: any) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n: any) => n.id));

    const relevantEdges = edges.filter((e: any) =>
      selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );

    const dataToExport = { nodes: selectedNodes, edges: relevantEdges };

    navigator.clipboard.writeText(JSON.stringify(dataToExport, null, 2))
      .then(() => alert(`${selectedNodes.length} nodes exported to clipboard!`))
      .catch(err => console.error('Failed to export nodes: ', err));
  },

  importNodes: async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const dataToImport = JSON.parse(clipboardText);

      if (!dataToImport.nodes || !Array.isArray(dataToImport.nodes)) {
        throw new Error('Invalid data format in clipboard.');
      }

      const { nodes: currentNodes, edges: currentEdges } = get();
      const idMapping = new Map();

      const newNodes = dataToImport.nodes.map((node: any, index: any) => {
        const oldId = node.id;
        const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${index}`;
        idMapping.set(oldId, newId);

        return {
          ...node,
          id: newId,
          position: { x: node.position.x + 20, y: node.position.y + 20 },
          selected: false,
        };
      });

      const newEdges = (dataToImport.edges || []).map((edge: any) => {
        const newSource = idMapping.get(edge.source);
        const newTarget = idMapping.get(edge.target);
        if (newSource && newTarget) {
          return {
            ...edge,
            id: `reactflow__edge-${newSource}${edge.sourceHandle || ''}-${newTarget}${edge.targetHandle || ''}`,
            source: newSource,
            target: newTarget,
          };
        }
        return null;
      }).filter(Boolean);

      set({
        nodes: [...currentNodes, ...newNodes],
        edges: [...currentEdges, ...newEdges],
      });

      alert(`${newNodes.length} nodes imported successfully!`);

    } catch (err) {
      console.error('Failed to import nodes: ', err);
      alert('Failed to import nodes from clipboard. Check console for details.');
    }
  },

  addScenarioAsGroup: async (backend: any, scenario: any, position: any) => {
    const { nodes: currentNodes, edges: currentEdges } = get();

    const scenarioData = await fetchScenarioData(backend, { scenarioId: scenario.id });
    if (!scenarioData || !scenarioData.nodes || scenarioData.nodes.length === 0) {
      alert(`Failed to load scenario data for '${scenario.name}' or it is empty.`);
      return;
    }

    const PADDING = 40;

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    scenarioData.nodes.forEach((node: any) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      const nodeWidth = node.width || 250;
      const nodeHeight = node.height || 150;
      maxX = Math.max(maxX, node.position.x + nodeWidth);
      maxY = Math.max(maxY, node.position.y + nodeHeight);
    });

    const groupPosition = position ? position : { x: minX, y: minY };
    const groupWidth = (maxX - minX) + PADDING * 2;
    const groupHeight = (maxY - minY) + PADDING * 2;

    const idPrefix = `group-${scenario.id}-${Date.now()}`;
    const groupNodeId = `group-${idPrefix}`;
    const idMapping = new Map();

    const childNodes = scenarioData.nodes.map((node: any) => {
      const newId = `${idPrefix}-${node.id}`;
      idMapping.set(node.id, newId);
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x - minX + PADDING,
          y: node.position.y - minY + PADDING
        },
        parentNode: groupNodeId,
        extent: 'parent'
      };
    });

    const groupNode = {
      id: groupNodeId,
      type: 'scenario',
      position: groupPosition,
      data: { label: scenario.name, scenarioId: scenario.id, isCollapsed: false },
      style: { width: groupWidth, height: groupHeight },
    };

    const newEdges = (scenarioData.edges || []).map((edge: any) => ({
      ...edge,
      id: `${idPrefix}-${edge.id}`,
      source: idMapping.get(edge.source),
      target: idMapping.get(edge.target),
    }));

    set({
      nodes: [...currentNodes, groupNode, ...childNodes],
      edges: [...currentEdges, ...newEdges],
    });
  },

  fetchScenario: async (backend: any, scenarioId: any) => {
    try {
      const data = await fetchScenarioData(backend, { scenarioId });
      // <<< [수정] 시나리오 로드 시 startNodeId도 설정 (백엔드에 저장된 값이 있다면) >>>
      set({
        nodes: data.nodes || [],
        edges: data.edges || [],
        selectedNodeId: null,
        startNodeId: data.startNodeId || null // <<< [수정]
      });
    } catch (error) {
      console.error("Error fetching scenario:", error);
      alert('Failed to load scenario details.');
      set({ nodes: [], edges: [], selectedNodeId: null, startNodeId: null }); // <<< [수정] startNodeId 초기화 추가
    }
  },

  saveScenario: async (backend: any, scenario: any) => {
    try {
      const { nodes, edges, startNodeId } = get(); // <<< [수정] startNodeId 가져오기
      await saveScenarioData(backend, {
        scenario,
        // <<< [수정] 저장 데이터에 startNodeId 포함 >>>
        data: { nodes, edges, startNodeId },
      });
      alert(`Scenario '${scenario.name}' has been saved successfully!`); // 시나리오 이름 포함
    } catch (error: any) {
      console.error("Error saving scenario:", error);
      alert(`Failed to save scenario: ${error.message}`);
    }
  },
});