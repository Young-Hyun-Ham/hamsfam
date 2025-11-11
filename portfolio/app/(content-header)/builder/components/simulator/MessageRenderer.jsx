// src/components/simulator/MessageRenderer.jsx

import React, { useRef, useEffect } from 'react'; // --- 💡 [수정] useState 제거 ---
import useBuilderStore from '../../store/index';
import styles from '../ChatbotSimulator.module.css';
// --- 👇 [수정] interpolateMessageForApi 제거 ---
import { interpolateMessage } from '../../utils/simulatorUtils';

// --- 👇 [수정] BotMessage -> BotMessagePart로 이름 변경, props 변경 (node -> part) ---
const BotMessagePart = ({ part, slots, onOptionClick, onFormSubmit, onFormDefault, isCompleted, formData, handleFormInputChange, handleFormMultiInputChange, handleGridRowClick, onExcelUpload }) => {
  const setSelectedRow = useBuilderStore((state) => state.setSelectedRow);

  // --- 👇 [수정] node -> part ---
  if (!part) return null;
  const { type, data, nodeId, linkData } = part; // part에서 데이터 추출

  if (type === 'iframe') {
    return (
      <div className={`${styles.message} ${styles.botMessage} ${styles.iframeContainer}`}>
        <iframe
          // --- 👇 [수정] data, interpolateMessage 사용 ---
          src={interpolateMessage(data.url, slots)}
          // --- 👆 [수정 끝] ---
          width={data.width || '100%'}
          height={data.height || '250'}
          style={{ border: 'none', borderRadius: '18px' }}
          title="chatbot-iframe"
        ></iframe>
      </div>
    );
  }

  if (type === 'link') {
    // --- 👇 [수정] linkData 사용 ---
    if (linkData) {
      return (
        <div style={{ marginTop: '8px' }}>
          <span>Opening link: </span>
          <a href={linkData.url} target="_blank" rel="noopener noreferrer">{linkData.display || linkData.url}</a>
        </div>
      );
    }
    return null;
  }

  if (type === 'form') {
    const hasSlotBoundGrid = data.elements?.some(el =>
      el.type === 'grid' &&
      el.optionsSlot &&
      Array.isArray(slots[el.optionsSlot]) &&
      slots[el.optionsSlot].length > 0 &&
      typeof slots[el.optionsSlot][0] === 'object' &&
      slots[el.optionsSlot][0] !== null
    );

    return (
      // --- 👇 [수정] 폼의 경우 하위 컴포넌트로 분리하지 않고 div로 래핑 ---
      <div className={styles.formContainer} style={{ width: '100%' }}>
        {/* --- 👇 [수정] interpolateMessage 사용 --- */}
        <h3>{interpolateMessage(data.title, slots)}</h3>
        {/* --- 👆 [수정 끝] --- */}
        {data.elements?.map(el => {
          const dateProps = {};
          if (el.type === 'date') {
            if (el.validation?.type === 'today after') dateProps.min = new Date().toISOString().split('T')[0];
            else if (el.validation?.type === 'today before') dateProps.max = new Date().toISOString().split('T')[0];
            else if (el.validation?.type === 'custom') {
              if (el.validation.startDate) dateProps.min = el.validation.startDate;
              if (el.validation.endDate) dateProps.max = el.validation.endDate;
            }
          }

          if (el.type === 'grid') {
            const gridDataFromSlot = el.optionsSlot ? slots[el.optionsSlot] : null;
            const hasSlotData = Array.isArray(gridDataFromSlot) && gridDataFromSlot.length > 0;

            if (hasSlotData) {
              const isDynamicObjectArray = typeof gridDataFromSlot[0] === 'object' && gridDataFromSlot[0] !== null && !Array.isArray(gridDataFromSlot[0]);
              if (isDynamicObjectArray) {
                // --- 💡 [수정] displayKeys 파싱 로직 변경 ---
                // 1. displayKeys가 정의되었는지 확인
                const hasDisplayKeys = el.displayKeys && el.displayKeys.length > 0;

                // 2. keyObject 배열 생성 (데이터 호환성 보장)
                const keyObjects = (hasDisplayKeys ? el.displayKeys : Object.keys(gridDataFromSlot[0] || {}))
                  .map(k => {
                    if (typeof k === 'string') return { key: k, label: k }; // 이전 포맷(string 배열) 호환
                    if (k && typeof k === 'object' && k.key) return k; // 새 포맷({key, label} 객체)
                    return null;
                  }).filter(Boolean); // null 값 제거

                // 3. 'hideNullColumns' 적용
                const filteredKeyObjects = el.hideNullColumns
                  ? keyObjects.filter(kObj => gridDataFromSlot.some(obj => obj[kObj.key] !== null && obj[kObj.key] !== undefined && obj[kObj.key] !== ""))
                  : keyObjects;
                // --- 💡 [수정 끝] ---

                return (
                  <div key={el.id} style={{ overflowX: 'auto' }}>
                    <table className={styles.formGridTable}>
                      <thead>
                        <tr>
                          {/* --- 💡 [수정] kObj.label 사용 --- */}
                          {filteredKeyObjects.map(kObj => <th key={kObj.key}>{interpolateMessage(kObj.label, slots)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {gridDataFromSlot.map((dataObject, index) => (
                          <tr key={`${el.id}-${index}`} onClick={() => !isCompleted && handleGridRowClick(dataObject)}>
                            {/* --- 💡 [수정] kObj.key 사용 --- */}
                            {filteredKeyObjects.map(kObj => (
                              <td key={kObj.key}>{interpolateMessage(dataObject[kObj.key] || '', slots)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              } else {
                const rows = gridDataFromSlot.length;
                const columns = gridDataFromSlot[0]?.length || 0;
                return (
                  <table key={el.id} className={styles.formGridTable}>
                    <tbody>
                      {[...Array(rows)].map((_, r) => (
                        <tr key={r}>
                          {[...Array(columns)].map((_, c) => {
                            const cellValue = gridDataFromSlot[r] ? gridDataFromSlot[r][c] : '';
                            {/* --- 👇 [수정] interpolateMessage 사용 --- */ }
                            return <td key={c}>{interpolateMessage(cellValue || '', slots)}</td>;
                            {/* --- 👆 [수정 끝] --- */ }
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }
            } else {
              const rows = el.rows || 2;
              const columns = el.columns || 2;
              return (
                <table key={el.id} className={styles.formGridTable}>
                  <tbody>
                    {[...Array(rows)].map((_, r) => (
                      <tr key={r}>
                        {[...Array(columns)].map((_, c) => {
                          const cellIndex = r * columns + c;
                          const cellValue = el.data && el.data[cellIndex] ? el.data[cellIndex] : '';
                          {/* --- 👇 [수정] interpolateMessage 사용 --- */ }
                          return <td key={c}>{interpolateMessage(cellValue || '', slots)}</td>;
                          {/* --- 👆 [수정 끝] --- */ }
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }
          }

          // --- 💡 [수정] 시작: input을 제어 컴포넌트로 변경하고 onDoubleClick 핸들러 추가 ---

          // 1. input, date, dropbox, checkbox의 현재 값과 기본값을 별도로 계산
          let currentValue = '';
          let resolvedDefaultValue = ''; // input의 더블클릭에 사용

          if (el.type === 'input') {
            const defaultValueConfig = el.defaultValue || '';
            resolvedDefaultValue = interpolateMessage(defaultValueConfig, slots); // 순수 기본값 (슬롯 보간)
            currentValue = formData[el.name] ?? resolvedDefaultValue; // 현재 값 (state 우선)
          } else if (el.type === 'date' || el.type === 'dropbox') {
            currentValue = formData[el.name] ?? el.defaultValue ?? '';
          } else if (el.type === 'checkbox') {
            currentValue = formData[el.name] ?? el.defaultValue ?? [];
          }

          return (
            <div key={el.id} className={styles.formElement}>
              {/* --- 👇 [수정] interpolateMessage 사용 --- */}
              <label className={styles.formLabel}>{interpolateMessage(el.label, slots)}</label>
              {/* --- 👆 [수정 끝] --- */}

              {/* 2. input: 'defaultValue' -> 'value'로 변경, onDoubleClick 추가 */}
              {el.type === 'input' && (
                <input
                  type={el.validation?.type === 'email' ? 'email' : 'text'}
                  className={styles.formInput}
                  placeholder={interpolateMessage(el.placeholder, slots)}
                  value={currentValue}
                  onChange={(e) => handleFormInputChange(el.name, e.target.value)}
                  onDoubleClick={() => {
                    if (!isCompleted) {
                      handleFormInputChange(el.name, resolvedDefaultValue);
                    }
                  }}
                  disabled={isCompleted}
                />
              )}

              {/* 3. date: 'value'에 currentValue 사용 (기존: formData[el.name] || '') */}
              {el.type === 'date' && (
                <input
                  type="date"
                  className={styles.formInput}
                  value={currentValue}
                  onChange={(e) => handleFormInputChange(el.name, e.target.value)}
                  disabled={isCompleted}
                  {...dateProps}
                />
              )}

              {/* 4. checkbox: 'checked'에 currentValue 사용 */}
              {el.type === 'checkbox' && el.options?.map(opt => (
                <div key={opt} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    id={`${el.id}-${opt}`}
                    value={opt}
                    checked={(currentValue || []).includes(opt)}
                    onChange={(e) => handleFormMultiInputChange(el.name, opt, e.target.checked)}
                    disabled={isCompleted}
                  />
                  <label htmlFor={`${el.id}-${opt}`}>{interpolateMessage(opt, slots)}</label>
                </div>
              ))}

              {/* 5. dropbox: 'value'에 currentValue 사용 */}
              {el.type === 'dropbox' && (() => {
                const options = Array.isArray(slots[el.optionsSlot]) ? slots[el.optionsSlot] : el.options;
                return (
                  <select
                    className={styles.formInput}
                    value={currentValue}
                    onChange={(e) => handleFormInputChange(el.name, e.target.value)}
                    disabled={isCompleted}
                  >
                    <option value="" disabled>Select...</option>
                    {(options || []).map(opt => {
                      const v = typeof opt === 'object' ? opt.value : opt;
                      const l = typeof opt === 'object' ? opt.label : opt;
                      return <option key={v} value={v}>{interpolateMessage(l, slots)}</option>;
                    })}
                  </select>
                );
              })()}
            </div>
          );
          // --- 💡 [수정] 끝 ---
        })}
        {!hasSlotBoundGrid && (
          <div className={styles.formButtonContainer}>
            {/* <<< [추가] 엑셀 업로드 버튼 >>> */}
            {data.enableExcelUpload && !isCompleted && (
              <button className={styles.formExcelButton} onClick={onExcelUpload} disabled={isCompleted}>
                Excel Upload
              </button>
            )}
            {/* <<< [수정] Default 버튼 완전 제거 >>> */}
            <button className={styles.formSubmitButton} onClick={onFormSubmit} disabled={isCompleted}>Submit</button>
          </div>
        )}
      </div>
    );
  }

  // --- 👇 [수정] interpolateMessage 사용 ---
  const message = interpolateMessage(data.content || data.label, slots);
  // --- 👆 [수정 끝] ---
  return (
    // --- 👇 [수정] 래핑 div 변경 및 스타일 조정 ---
    <div style={{ width: '100%' }}>
      <div>{message}</div>
      {type === 'branch' && data.evaluationType === 'BUTTON' && (
        <div className={styles.branchButtonsContainer}>
          {/* --- 👇 [수정] interpolateMessage 사용 --- */}
          {data.replies?.map(reply => <button key={reply.value} className={styles.branchButton} onClick={() => onOptionClick(reply)} disabled={isCompleted}>{interpolateMessage(reply.display, slots)}</button>)}
          {/* --- 👆 [수정 끝] --- */}
        </div>
      )}
      {/* --- 👇 [추가] slotfilling 버튼 렌더링 --- */}
      {type === 'slotfilling' && data.replies && data.replies.length > 0 && (
        <div className={styles.branchButtonsContainer}>
          {data.replies.map(reply => <button key={reply.value} className={styles.branchButton} onClick={() => onOptionClick(reply)} disabled={isCompleted}>{interpolateMessage(reply.display, slots)}</button>)}
        </div>
      )}
      {/* --- 👆 [추가 끝] --- */}
    </div>
    // --- 👆 [수정 끝] ---
  );
};


// --- 👇 [삭제] CombinedBubble 컴포넌트 전체 삭제 ---
/*
const CombinedBubble = ({
    parts, // item.combinedData
    ...
}) => {
    ... (useState, useEffect, setTimeout 로직) ...
};
*/
// --- 👆 [삭제 끝] ---


// <<< [수정] onExcelUpload prop 추가 >>>
const MessageRenderer = ({ item, nodes, onOptionClick, handleFormSubmit, handleFormDefault, formData, handleFormInputChange, handleFormMultiInputChange, handleGridRowClick, onExcelUpload }) => {
  const slots = useBuilderStore((state) => state.slots);
  const historyRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [item]); // --- 💡 [수정] item으로 변경 (combinedData 변경 시 스크롤) ---

  // --- 👇 [수정] 렌더링 로직 수정 ---
  switch (item.type) {
    case 'bot_streaming':
      // ... (변경 없음)
      return (
        <div className={styles.messageRow}>
          <img src={item.isStreaming ? "/images/avatar-loading.png" : "/images/avatar.png"} alt="Avatar" className={styles.avatar} />
          <div className={`${styles.message} ${styles.botMessage}`}>{item.content}</div>
        </div>
      );
    case 'loading':
      // ... (변경 없음)
      return (
        <div className={styles.messageRow}>
          <img src="/images/avatar-loading.png" alt="Avatar" className={styles.avatar} />
          <div className={`${styles.message} ${styles.botMessage}`}><img src="/images/Loading.gif" alt="Loading..." style={{ width: '80px', height: '60px' }} /></div>
        </div>
      );
    case 'bot':
      // 1. API 에러 등 간단한 메시지 처리 (기존 로직)
      if (item.message) {
        return (
          <div className={styles.messageRow}>
            <img src="/images/avatar.png" alt="Avatar" className={styles.avatar} />
            <div className={`${styles.message} ${styles.botMessage}`}>{interpolateMessage(item.message, slots)}</div>
          </div>
        );
      }

      // 2. 묶인 데이터(combinedData) 처리 (CombinedBubble 제거)
      if (item.combinedData) {
        return (
          <div className={styles.messageRow}>
            <img src="/images/avatar.png" alt="Avatar" className={styles.avatar} />
            {/* 하나의 말풍선 div 안에 묶인 파트들을 순차적으로 렌더링 */}
            <div className={`${styles.message} ${styles.botMessage}`}>
              {item.combinedData.map((part, index) => (
                <BotMessagePart
                  key={part.nodeId || index}
                  part={part}
                  slots={slots}
                  onOptionClick={onOptionClick}
                  // --- 👇 [수정] prop 이름 변경 (handleFormSubmit -> onFormSubmit) ---
                  onFormSubmit={handleFormSubmit}
                  // --- 👆 [수정 끝] ---
                  onFormDefault={handleFormDefault}
                  // --- 💡 [수정] 마지막 파트만 isCompleted를 따르도록 수정 ---
                  isCompleted={index < item.combinedData.length - 1 ? true : item.isCompleted}
                  formData={formData}
                  handleFormInputChange={handleFormInputChange}
                  handleFormMultiInputChange={handleFormMultiInputChange}
                  handleGridRowClick={handleGridRowClick}
                  onExcelUpload={onExcelUpload}
                />
              ))}
            </div>
          </div>
        );
      }
      return null; // 렌더링할 데이터가 없는 경우
    // --- 👆 [수정 끝] ---
    case 'user':
      // ... (변경 없음)
      return (
        <div className={`${styles.messageRow} ${styles.userRow}`}>
          <div className={`${styles.message} ${styles.userMessage}`}>{item.message}</div>
        </div>
      );
    default:
      return null;
  }
};

export default MessageRenderer;