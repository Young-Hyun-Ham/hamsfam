// app/(content-header)/builder/components/ChatbotSimulator.jsx

import { useState, useEffect, useCallback } from 'react';
import useBuilderStore from '../store/index';
import styles from './ChatbotSimulator.module.css';
import { useChatFlow } from './controllers/hooks/useChatFlow';
import { validateInput, interpolateMessage, getNestedValue, setNestedValue } from '../utils/simulatorUtils';
import SimulatorHeader from './simulator/SimulatorHeader';
import MessageHistory from './simulator/MessageHistory';
import UserInput from './simulator/UserInput';

function ChatbotSimulator({ nodes, edges, isVisible, isExpanded, setIsExpanded }) {
  const { history, setHistory, currentId, currentNode, fixedMenu, isStarted, startSimulation, proceedToNextNode } = useChatFlow(nodes, edges);
  const { slots, setSlots } = useBuilderStore();
  const [formData, setFormData] = useState({});

  const completeCurrentInteraction = () => {
    setHistory(prev => prev.map(item => item.nodeId === currentId ? { ...item, isCompleted: true } : item));
  };

  const handleTextInputSend = (text) => {
    if (!currentNode) return;
    setHistory(prev => [...prev, { type: 'user', message: text }]);
    let newSlots = { ...slots };
    if (currentNode.data.slot) {
      newSlots[currentNode.data.slot] = text;
      setSlots(newSlots);
    }
    proceedToNextNode(null, currentId, newSlots);
  };

  const handleOptionClick = (answer, sourceNodeId = currentId) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    setHistory(prev => [...prev, { type: 'user', message: answer.display }]);
    completeCurrentInteraction();

    let newSlots = { ...slots };
    if (sourceNode.data.slot && sourceNode.type === 'slotfilling') {
      newSlots[sourceNode.data.slot] = answer.value;
      setSlots(newSlots);
    }

    const sourceHandleId = (sourceNode.type === 'branch' || sourceNode.type === 'fixedmenu') ? answer.value : null;
    proceedToNextNode(sourceHandleId, sourceNodeId, newSlots);
  };

  const handleFormInputChange = (elementName, value) => {
    setFormData(prev => ({ ...prev, [elementName]: value }));
  };

  const handleFormMultiInputChange = (elementName, value, checked) => {
    setFormData(prev => {
      const existingValues = prev[elementName] || [];
      const newValues = checked ? [...existingValues, value] : existingValues.filter(v => v !== value);
      return { ...prev, [elementName]: newValues };
    });
  };

  const handleFormSubmit = () => {
    for (const element of currentNode.data.elements) {
      if (element.type === 'input' || element.type === 'date') {
        const value = formData[element.name] || '';
        if (!validateInput(value, element.validation)) {
          let alertMessage = `'${element.label}' input is not valid.`;
          if (element.validation?.type === 'today after') alertMessage = `'${element.label}' must be today or a future date.`;
          else if (element.validation?.type === 'today before') alertMessage = `'${element.label}' must be today or a past date.`;
          else if (element.validation?.type === 'custom' && element.validation?.startDate && element.validation?.endDate) alertMessage = `'${element.label}' must be between ${element.validation.startDate} and ${element.validation.endDate}.`;
          alert(alertMessage);
          return;
        }
      }
    }
    completeCurrentInteraction();
    const newSlots = { ...slots, ...formData };
    setSlots(newSlots);
    setFormData({});
    setHistory(prev => [...prev, { type: 'user', message: "Form submitted." }]);
    proceedToNextNode(null, currentId, newSlots);
  };

  const handleFormDefault = () => {
    if (!currentNode || currentNode.type !== 'form') return;
    const defaultData = {};
    currentNode.data.elements.forEach(element => {
      if (element.name && element.defaultValue !== undefined) {
        defaultData[element.name] = element.defaultValue;
      }
    });
    setFormData(defaultData);
  };

  /**
   * 그리드 행 클릭 시 호출되는 핸들러.
   * 1. 폼 상호작용 완료 처리
   * 2. 'selectedRow' 슬롯에 클릭된 행의 데이터 저장
   * 3. 다음 노드로 진행
   */


  const handleFormElementApiCall = useCallback(async (clickedElement) => {
    if (!currentNode || currentNode.type !== 'form') {
      return;
    }
    const element = currentNode.data.elements.find(e => e.id === clickedElement.id);

    if (!element || !element.apiConfig || !element.resultSlot) {
      alert("Search element is not configured correctly. (Missing API URL or Result Slot)");
      return;
    }

    const { apiConfig, resultSlot } = element;
    const searchTerm = formData[element.name] || '';

    // 💡 수정: slots와 formData를 모두 포함하여 폼의 다른 필드 값을 API 파라미터로 사용할 수 있게 합니다.
    const allValues = { ...slots, ...formData, value: searchTerm };
    const method = apiConfig.method || 'POST';

    try {
      const interpolatedUrl = interpolateMessage(apiConfig.url, allValues);

      // Headers 처리
      const rawHeaders = apiConfig.headers || '{}';
      let interpolatedHeaders = {};
      try {
        const interpolatedHeadersString = interpolateMessage(rawHeaders, allValues);
        interpolatedHeaders = JSON.parse(interpolatedHeadersString);
      } catch (e) {
        console.warn("Invalid Headers JSON or interpolation error:", rawHeaders, e);
      }


      const fetchOptions = {
        method: method,
        headers: {
          // 기본 Content-Type 설정 및 interpolatedHeaders 병합
          'Content-Type': 'application/json',
          ...interpolatedHeaders
        },
      };

      if (method === 'GET') {
        // GET 요청 시 Body 필드를 제거
        delete fetchOptions.headers['Content-Type'];
      } else if (method === 'POST') {
        const interpolatedBody = interpolateMessage(apiConfig.bodyTemplate || '{}', allValues);
        fetchOptions.body = interpolatedBody;
      }

      const response = await fetch(interpolatedUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`API call failed with status ${response.status}`);
      }

      const responseData = await response.json();

      const newSlots = { ...slots, [resultSlot]: responseData };
      setSlots(newSlots);

    } catch (error) {
      console.error("Form element API call failed:", error);
      alert(`Search failed: ${error.message}`);
    }
  }, [formData, slots, setSlots, currentNode]);

  const handleGridRowClick = (rowData, gridElement) => {
    if (!currentNode || currentNode.type !== 'form' || !gridElement) {
      return;
    }

    // 1. 그리드의 Data Slot에서 최상위 슬롯 키를 추출 (예: 'key1.key2.array' -> 'key1')
    const gridSlotPath = gridElement.optionsSlot;
    const rootSlotKey = gridSlotPath ? gridSlotPath.split('.')[0] : null;

    // 2. 이 그리드와 연결된 'search' 엘리먼트 찾기
    //    조건: search element의 resultSlot이 grid의 최상위 슬롯 키와 일치해야 함
    const searchElement = currentNode.data.elements.find(
      e => e.type === 'search' && e.resultSlot === rootSlotKey
    ); //

    if (!searchElement || !searchElement.name) {
      // 3. (Fallback) - search element가 없으면 기본 로직 수행
      completeCurrentInteraction();
      const newSlots = { ...slots, ...formData, selectedRow: rowData };
      setSlots(newSlots);
      setFormData({});
      setHistory(prev => [...prev, { type: 'user', message: "Row selected." }]);
      proceedToNextNode(null, currentId, newSlots);
      return;
    }

    // 4. searchElement에 inputFillKey가 지정되어 있는지 확인하고 채울 값 결정
    const inputFillKey = searchElement.inputFillKey;
    let valueToFill;

    if (inputFillKey && rowData[inputFillKey] !== undefined) {
      // 4a. inputFillKey가 지정되어 있고 rowData에 해당 키가 있으면 해당 값을 사용
      valueToFill = rowData[inputFillKey];
    } else {
      // 4b. inputFillKey가 없거나 rowData에 해당 키가 없으면 기존 로직 (첫 번째 컬럼 값) 사용
      const gridKeys = (gridElement.displayKeys && gridElement.displayKeys.length > 0)
        ? gridElement.displayKeys.map(k => k.key)
        : Object.keys(rowData);

      const firstColumnKey = gridKeys[0];
      valueToFill = firstColumnKey ? rowData[firstColumnKey] : '';
    }

    // 5. (성공) formData 업데이트 (검색창 값 변경)
    setFormData(prevData => ({
      ...prevData,
      [searchElement.name]: valueToFill
    }));

    // 6. slots 업데이트 (그리드 데이터 지우기 + selectedRow 설정)

    // 💡 수정: 얕은 복사본을 만들어 setNestedValue로 deep path를 빈 배열로 업데이트
    const newSlots = { ...slots, selectedRow: rowData }; // selectedRow는 얕게 덮어쓰기

    if (gridElement.optionsSlot) {
      setNestedValue(newSlots, gridElement.optionsSlot, []); // 깊은 경로를 빈 배열로 설정
    }

    setSlots(newSlots);
    // 7. 다음 노드로 진행하지 않음.
  };


  // 엑셀 업로드 버튼 핸들러 (임시)
  const handleExcelUpload = () => {
    // TODO: 실제 엑셀 업로드 및 파싱 로직 구현 필요
    alert('Excel Upload button clicked! (Logic not implemented yet)');
    // 예: 엑셀 파일 읽기 -> JSON 변환 -> setFormData(jsonData)
  };

  return (
    <div className={`${styles.simulator} ${isExpanded ? styles.expanded : ''}`}>
      <SimulatorHeader isVisible={isVisible} isExpanded={isExpanded} setIsExpanded={setIsExpanded} onStart={() => startSimulation()} />

      {fixedMenu && (
        <div className={styles.fixedMenuContainer}>
          <p className={styles.fixedMenuTitle}>{fixedMenu.content}</p>
          <div className={styles.fixedMenuButtons}>
            {fixedMenu.replies?.map(reply => (
              <button key={reply.value} className={styles.fixedMenuButton} onClick={() => handleOptionClick(reply, fixedMenu.nodeId)}>
                {reply.display}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isStarted ? (
        <div className={styles.history}>
          <div className={styles.startScreen}></div>
        </div>
      ) : (
        <MessageHistory
          history={history}
          nodes={nodes}
          onOptionClick={handleOptionClick}
          handleFormSubmit={handleFormSubmit}
          handleFormDefault={handleFormDefault}
          formData={formData}
          handleFormInputChange={handleFormInputChange}
          handleFormMultiInputChange={handleFormMultiInputChange}
          handleGridRowClick={handleGridRowClick}
          onExcelUpload={handleExcelUpload}
          handleFormElementApiCall={handleFormElementApiCall}
        />
      )
      }

      <UserInput
        currentNode={currentNode}
        isStarted={isStarted}
        onTextInputSend={handleTextInputSend}
        onOptionClick={handleOptionClick}
      />
    </div>
  );
}

export default ChatbotSimulator;