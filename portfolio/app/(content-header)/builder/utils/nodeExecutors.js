// src/nodeExecutors.js
import { interpolateMessage, generateUniqueId } from './simulatorUtils';

/**
 * 말풍선에 표시되는 노드(message, form, link, iframe, slotfilling, branch(button))를 처리하는 공통 함수.
 * 체인 로직(chainNext)을 포함합니다.
 * @param {object} context - 실행 컨텍스트
 * @param {boolean} isInteractive - 사용자 입력이 필요한 노드인지 여부
 * @param {function} preparePacket - (선택) nodeDataPacket을 가공하는 함수
 */
const handleVisibleNode = (context, isInteractive, preparePacket = null) => {
  const { node, updatedSlots, activeChainId, setHistory, proceedToNextNode, setSlots } = context;

  // 1. 노드 데이터 패킷 생성
  let nodeDataPacket = {
    type: node.type,
    nodeId: node.id,
    data: node.data,
  };

  // 2. (선택) 패킷 가공 (예: Link 노드의 URL 삽입)
  if (preparePacket) {
    nodeDataPacket = preparePacket(nodeDataPacket, updatedSlots);
  }
  
  // 3. 폼 노드인 경우, 기본값(defaultValue)을 보간하여 슬롯에 선제적으로 적용
  if (node.type === 'form') {
    let initialSlotsUpdate = {};
    (node.data.elements || []).forEach(element => {
      if (element.type === 'input' && element.name && element.defaultValue !== undefined && element.defaultValue !== '') {
        const defaultValueConfig = element.defaultValue;
        let resolvedValue = interpolateMessage(String(defaultValueConfig), updatedSlots);
        if (resolvedValue !== undefined) {
          initialSlotsUpdate[element.name] = resolvedValue;
        }
      } else if ((element.type === 'date' || element.type === 'dropbox') && element.name && element.defaultValue !== undefined && element.defaultValue !== '') {
        initialSlotsUpdate[element.name] = interpolateMessage(String(element.defaultValue), updatedSlots);
      } else if (element.type === 'checkbox' && element.name && Array.isArray(element.defaultValue)) {
        initialSlotsUpdate[element.name] = element.defaultValue;
      }
    });
    const finalSlotsForForm = { ...updatedSlots, ...initialSlotsUpdate };
    if (Object.keys(initialSlotsUpdate).length > 0) {
      setSlots(finalSlotsForForm);
      // updatedSlots도 갱신하여 폼 렌더링에 즉시 반영
      Object.assign(updatedSlots, finalSlotsForForm);
    }
  }

  // 4. 체인(연결) 여부 결정
  const isChaining = node.data.chainNext === true && !isInteractive;

  if (!activeChainId) {
    // --- A. 새 체인 시작 ---
    const newChainId = generateUniqueId();
    const newItem = {
      type: 'bot',
      id: newChainId, // 새 말풍선 ID
      combinedData: [nodeDataPacket], // 이 노드를 첫 번째 멤버로 추가
      isCompleted: !isInteractive,
      isChaining: isChaining,
    };
    setHistory(prev => [...prev, newItem]);

    if (!isInteractive) {
      // 500ms 딜레이 후 다음 노드로 진행
      setTimeout(() => {
        proceedToNextNode(null, node.id, updatedSlots, isChaining ? newChainId : null);
      }, 500);
    }
  } else {
    // --- B. 기존 체인에 덧붙이기 ---
    setHistory(prev => prev.map(item =>
      item.id === activeChainId
        ? {
          ...item,
          combinedData: [...item.combinedData, nodeDataPacket], // 현재 노드 덧붙이기
          isCompleted: !isInteractive, // 갱신
          isChaining: isChaining,
        }
        : item
    ));

    if (!isInteractive) {
      // 500ms 딜레이 후 다음 노드로 진행
      setTimeout(() => {
        proceedToNextNode(null, node.id, updatedSlots, isChaining ? activeChainId : null);
      }, 500);
    }
  }
};

// --- 노드 타입별 실행기 (Strategy) ---

/** (보이지 않는 노드) Delay: 딜레이 후 다음 노드 진행 */
export const delay = (context) => {
  const { node, updatedSlots, activeChainId, proceedToNextNode } = context;
  const duration = node.data.duration || 0;
  setTimeout(() => {
    proceedToNextNode(null, node.id, updatedSlots, activeChainId);
  }, duration);
};

/** (보이지 않는 노드) Set Slot: 슬롯 설정 후 즉시 다음 노드 진행 */
export const setSlot = (context) => {
  const { node, updatedSlots, activeChainId, proceedToNextNode, setSlots } = context;
  
  const newSlots = { ...updatedSlots };
  node.data.assignments?.forEach(assignment => {
    if (assignment.key) {
      const interpolatedValue = interpolateMessage(assignment.value, updatedSlots);
      try {
        const trimmedValue = interpolatedValue.trim();
        if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) || (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
          newSlots[assignment.key] = JSON.parse(trimmedValue);
        } else if (trimmedValue.toLowerCase() === 'true') {
          newSlots[assignment.key] = true;
        } else if (trimmedValue.toLowerCase() === 'false') {
          newSlots[assignment.key] = false;
        } else if (!isNaN(trimmedValue) && trimmedValue !== '') {
          const num = Number(trimmedValue);
          if (!isNaN(num)) newSlots[assignment.key] = num;
          else newSlots[assignment.key] = interpolatedValue;
        } else {
          newSlots[assignment.key] = interpolatedValue;
        }
      } catch (e) {
        newSlots[assignment.key] = interpolatedValue;
      }
    }
  });
  
  setSlots(newSlots);
  proceedToNextNode(null, node.id, newSlots, activeChainId);
};

/** (보이지 않는 노드) Toast: 알림창 표시 후 즉시 다음 노드 진행 */
export const toast = (context) => {
  const { node, updatedSlots, activeChainId, proceedToNextNode } = context;
  const message = interpolateMessage(node.data.message, updatedSlots);
  alert(`[${node.data.toastType || 'info'}] ${message}`);
  proceedToNextNode(null, node.id, updatedSlots, activeChainId);
};

/** (보이지 않는 노드) Start / Condition Branch: 즉시 다음 노드 진행 */
export const invisible = (context) => {
  const { node, updatedSlots, activeChainId, proceedToNextNode } = context;
  proceedToNextNode(null, node.id, updatedSlots, activeChainId);
};

/** (보이는/인터랙티브 노드) Fixed Menu: 히스토리 초기화 및 메뉴 설정 */
export const fixedmenu = (context) => {
  const { node, setHistory, setFixedMenu, setCurrentId } = context;
  setHistory([]); // 새 메시지이므로 히스토리 초기화
  setFixedMenu({ nodeId: node.id, ...node.data });
  setCurrentId(node.id);
  // fixedmenu는 history에 추가하거나 proceed하지 않음
};

/** (보이지 않는 노드) Scenario Group: 그룹 내부의 시작 노드 탐색 후 실행 */
export const scenario = (context) => {
  const { node, updatedSlots, activeChainId, proceedToNextNode, nodes, edges, setCurrentId, addBotMessage } = context;
  
  const childNodes = nodes.filter(n => n.parentNode === node.id);
  const childNodeIds = new Set(childNodes.map(n => n.id));
  
  // 그룹 내부의 시작 노드 찾기 (들어오는 엣지가 없는 노드)
  const startNode = childNodes.find(n =>
    !edges.some(e => e.target === n.id && childNodeIds.has(e.source))
  );

  if (startNode) {
    setCurrentId(startNode.id);
    addBotMessage(startNode.id, updatedSlots, activeChainId); // 재귀 호출
  } else {
    // 시작 노드가 없으면 그룹을 건너뛰고 다음 노드 진행
    proceedToNextNode(null, node.id, updatedSlots, activeChainId);
  }
};

// --- 보이는 노드들 ---

/** (보이는 노드) Message */
export const message = (context) => {
  handleVisibleNode(context, false);
};

/** (보이는 노드) Link */
export const link = (context) => {
  const preparePacket = (packet, slots) => {
    const url = interpolateMessage(packet.data.content, slots);
    const display = interpolateMessage(packet.data.display, slots);
    packet.linkData = { url, display }; // linkData 설정
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return packet;
  };
  handleVisibleNode(context, false, preparePacket);
};

/** (보이는 노드) iFrame */
export const iframe = (context) => {
  handleVisibleNode(context, false);
};

/** (보이는/인터랙티브 노드) Form */
export const form = (context) => {
  handleVisibleNode(context, true);
};

/** (보이는/인터랙티브 노드) Slot Filling */
export const slotfilling = (context) => {
  handleVisibleNode(context, true);
};

/** (보이는/인터랙티브 노드) Button Branch */
export const branch = (context) => {
  if (context.node.data.evaluationType === 'BUTTON') {
    handleVisibleNode(context, true);
  } else {
    // Condition Branch는 invisible과 동일하게 처리
    invisible(context);
  }
};