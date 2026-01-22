"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useModal } from '@/providers/ModalProvider';

import ReactFlow, { Controls, useReactFlow, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

import useBuilderStore, { ALL_NODE_TYPES } from '../store/index';
import styles from './Detail.module.css';

import MessageNode from './nodes/MessageNode';
import BranchNode from './nodes/BranchNode';
import SlotFillingNode from './nodes/SlotFillingNode';
import ApiNode from './nodes/ApiNode';
import FormNode from './nodes/FormNode';
import FixedMenuNode from './nodes/FixedMenuNode';
import LinkNode from './nodes/LinkNode';
import LlmNode from './nodes/LlmNode';
import ToastNode from './nodes/ToastNode';
import IframeNode from './nodes/IframeNode';
import ScenarioNode from './nodes/ScenarioNode';
import SetSlotNode from './nodes/SetSlotNode';
import DelayNode from './nodes/DelayNode';

import ScenarioGroupModal from './modals/ScenarioGroupModal';
import SlotDisplay from './SlotDisplay';
import NodeController from './NodeController';
import ChatbotSimulator from './ChatbotSimulator';
import { IconListBack, SettingsIcon } from './icons/Icons';
import LogPreview from './modals/LogPreview';

const nodeTypes = {
  message: MessageNode,
  branch: BranchNode,
  slotfilling: SlotFillingNode,
  api: ApiNode,
  form: FormNode,
  fixedmenu: FixedMenuNode,
  link: LinkNode,
  llm: LlmNode,
  toast: ToastNode,
  iframe: IframeNode,
  scenario: ScenarioNode,
  setSlot: SetSlotNode,
  delay: DelayNode,
};

// 💡 [추가] 노드 레이블 매핑
const nodeLabels = {
  message: '+ Message',
  form: '+ Form',
  branch: '+ Condition Branch',
  slotfilling: '+ SlotFilling',
  api: '+ API',
  llm: '+ LLM',
  setSlot: '+ Set Slot',
  delay: '+ Delay',
  fixedmenu: '+ Fixed Menu',
  link: '+ Link',
  toast: '+ Toast',
  iframe: '+ iFrame',
  scenario: '+ Scenario Group', // Scenario Group 버튼용
} as any;

const Flow = ({ scenario, backend, scenarios, onClose }: any) => {
  const router = useRouter();
  const { showAlert, showConfirm } = useModal();
  const user = useStore((s: any) => s.user);

  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    fetchScenario, saveScenario, addNode, selectedNodeId,
    setSelectedNodeId, duplicateNode, deleteSelectedEdges,
    nodeColors, setNodeColor, nodeTextColors, setNodeTextColor,
    exportSelectedNodes, importNodes, addScenarioAsGroup,
    visibleNodeTypes, setNodes, setEdges,
  } = useBuilderStore();

  const { getNodes, project } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const selectedNodesCount = getNodes().filter(n => n.selected).length;

  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isSimulatorVisible, setIsSimulatorVisible] = useState(false);
  const [isColorSettingsVisible, setIsColorSettingsVisible] = useState(false);
  const [isSimulatorExpanded, setIsSimulatorExpanded] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const [isLogVisible, setIsLogVisible] = useState(false);

  useEffect(() => {
    if (scenario) {
      fetchScenario(backend, scenario.id);
    }
  }, [scenario, backend, fetchScenario]);

  const visibleNodes = useMemo(() => {
    const collapsedGroupIds = new Set(nodes.filter((n: any) => n.type === 'scenario' && n.data.isCollapsed).map((n: any) => n.id));
    return nodes.filter((n: any) => !n.parentNode || !collapsedGroupIds.has(n.parentNode));
  }, [nodes]);

  const handleNodeClick = (event: any, node: any) => {
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleMainResize = (mouseDownEvent: any) => {
    mouseDownEvent.preventDefault();
    const startSize = rightPanelWidth;
    const startPosition = mouseDownEvent.clientX;

    const onMouseMove = (mouseMoveEvent: any) => {
      const newSize = startSize - (mouseMoveEvent.clientX - startPosition);
      if (newSize > 350 && newSize < 1000) {
        setRightPanelWidth(newSize);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDuplicateNode = () => {
    if (selectedNodeId) {
      duplicateNode(selectedNodeId);
    }
  };

  const handleKeyDown = (event: any) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const isNodeSelected = nodes.some((node: any) => node.selected);
      if (!isNodeSelected) {
        deleteSelectedEdges();
      }
    }
  };

  const onDragStart = (event: any, nodeType: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (!reactFlowBounds) return;
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(type, position);
    },
    [project, addNode]
  );

  const handleExportNodes = () => {
    const allNodes = getNodes();
    const selectedNodes = allNodes.filter(n => n.selected);
    exportSelectedNodes(selectedNodes);
  };

  // 💡 [수정] 스토어의 visibleNodeTypes를 기반으로 버튼 필터링
  const visibleNodeButtons = ALL_NODE_TYPES
    .filter((type: any) => visibleNodeTypes.includes(type) && type !== 'fixedmenu' && type !== 'scenario')
    .map((type: any) => ({ type, label: nodeLabels[type] || `+ ${type}` }));

  // 💡 [수정] 컬러 세팅은 모든 노드(fixedmenu 제외)에 대해 표시
  const colorSettingButtons = ALL_NODE_TYPES
    .filter((type: any) => type !== 'fixedmenu' && type !== 'scenario')
    .map((type: any) => ({ type, label: nodeLabels[type] || `+ ${type}` }));

  // 관리자 인지 확인
  const isAdmin = user.roles.some((t: string) => t.includes('admin'));

  return (
    <div className={styles.flowContainer}>
      <ScenarioGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        scenarios={scenarios.filter((s: any) => s.id !== scenario.id)}
        onSelect={(selected: any) => {
          addScenarioAsGroup(backend, selected);
          setIsGroupModalOpen(false);
        }}
      />
      <div className={styles.leftSidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Add Node</h3>
          <span className={styles.globalColorSettingButton} onClick={() => setIsColorSettingsVisible(!isColorSettingsVisible)}>
            <SettingsIcon />
          </span>
        </div>

        {isColorSettingsVisible && (
          <div className={styles.colorSettingsPanel}>
            {/* 💡 [수정] colorSettingButtons 사용 */}
            {colorSettingButtons.map(({ type, label }: any) => (
              <div key={type} className={styles.colorSettingItem}>
                <span>{label.replace('+ ', '')}</span>
                <div className={styles.colorInputs}>
                  <input
                    type="color"
                    value={nodeColors[type]}
                    onChange={(e) => setNodeColor(type, e.target.value)}
                  />
                  <input
                    type="color"
                    value={nodeTextColors[type]}
                    onChange={(e) => setNodeTextColor(type, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 💡 [수정] visibleNodeButtons 사용 */}
        {visibleNodeButtons.map(({ type, label }: any) => (
          <button
            key={type}
            onClick={() => addNode(type)}
            onDragStart={(event) => onDragStart(event, type)}
            draggable
            className={styles.sidebarButton}
            style={{
              backgroundColor: nodeColors[type],
              color: nodeTextColors[type]
            }}
          >
            {label}
          </button>
        ))}

        {/* 💡 [수정] 'scenario' 타입이 visibleNodeTypes에 있을 때만 Scenario Group 버튼 표시 */}
        {visibleNodeTypes.includes('scenario') && (
          <>
            <div className={styles.separator} />
            <button onClick={() => setIsGroupModalOpen(true)} className={styles.sidebarButton} style={{ backgroundColor: nodeColors.scenario, color: nodeTextColors.scenario }}>
              + Scenario Group
            </button>
          </>
        )}

        <div className={styles.separator} />
        <button onClick={importNodes} className={styles.sidebarButton} style={{ backgroundColor: '#555', color: 'white' }}>
          Import Nodes
        </button>
        <button onClick={handleExportNodes} className={styles.sidebarButton} disabled={selectedNodesCount === 0} style={{ backgroundColor: '#555', color: 'white' }}>
          Export Nodes ({selectedNodesCount})
        </button>

        {selectedNodeId && (
          <>
            <div className={styles.separator} />
            <button onClick={handleDuplicateNode} className={`${styles.sidebarButton} ${styles.duplicateButton}`}>
              + Duplicate Node
            </button>
          </>
        )}
      </div>

      <div className={styles.mainContent} ref={reactFlowWrapper}>
        <SlotDisplay />
        <div className={styles.topRightControls}>
          <div onClick={() => saveScenario(backend, scenario)}>
            <img src="/images/save.png" alt="Save Icon" className={styles.saveButton} />
          </div>
          <div onClick={() => setIsSimulatorVisible(!isSimulatorVisible)}>
            <img src="/images/chat_simulator.png" alt="Simulator Icon" className={!isSimulatorVisible ? styles.botButtonHidden : styles.botButton} />
          </div>
          {isAdmin ? (
            <div onClick={() => setIsLogVisible(true)}>
              <img src="/images/log.png" alt="log Icon" className={!isLogVisible ? styles.botButtonHidden : styles.botButton} />
            </div>
          ) : null}
          <div onClick={onClose}>
            <span className={styles.globalColorSettingButton}>
              <IconListBack width="35" height="35" />
            </span>
          </div>
        </div>
        <ReactFlow
          nodes={visibleNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onKeyDown={handleKeyDown}
          onDragOver={onDragOver}
          onDrop={onDrop}
          defaultViewport={{ x: 0, y: 0, zoom: 0.1 }}
          fitView={false}
          style={{ backgroundColor: '#ffffff' }}
        >
          <Controls />
          <MiniMap nodeColor={(n: any) => nodeColors[n.type] || '#ddd'} nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>

      <div className={`${styles.controllerPanel} ${selectedNodeId ? styles.visible : ''}`}>
        <NodeController backend={backend} />
      </div>

      <div className={`${styles.resizerV} ${isSimulatorVisible && !isSimulatorExpanded ? styles.visible : ''}`} onMouseDown={handleMainResize} />

      <div
        className={`${styles.rightContainer} ${isSimulatorVisible ? styles.visible : ''}`}
        style={{ width: isSimulatorExpanded ? 'max(600px, 50%)' : isSimulatorVisible ? `${rightPanelWidth}px` : '0' }}
      >
        <div className={styles.panel}>
          <ChatbotSimulator
            nodes={nodes}
            edges={edges}
            isVisible={isSimulatorVisible}
            isExpanded={isSimulatorExpanded}
            setIsExpanded={setIsSimulatorExpanded}
          />
        </div>
      </div>

      {/* isLogVisible 로 hidden / flex 전환 */}
      <div
        className={`${isLogVisible ? 'flex' : 'hidden'} fixed inset-0 z-50 items-center justify-center bg-black/40`}
        onClick={() => setIsLogVisible(false)}
      >
        <div
          className="bg-white w-[800px] max-w-[95vw] max-h-[80vh] rounded-lg shadow-lg flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h2 className="text-sm font-semibold">Log (DB JSON 편집)</h2>
            <button
              onClick={() => setIsLogVisible(false)}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            >
              닫기
            </button>
          </div>

          <div className="p-4 overflow-y-auto">
            <LogPreview
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { ReactFlowProvider } from 'reactflow';

function ScenarioDetail(props: any) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

export default ScenarioDetail;