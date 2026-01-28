// app/(content-header)/builder/components/simulator/MessgeRenderer.jsx

import React, { useRef, useEffect } from 'react';
import useBuilderStore from '../../store/index';
import styles from '../ChatbotSimulator.module.css';
import { interpolateMessage, validateInput, getNestedValue } from '../../utils/simulatorUtils';

const BotMessagePart = ({
  part,
  slots,
  onOptionClick,
  onFormSubmit,
  onFormDefault,
  isCompleted,
  formData,
  handleFormInputChange,
  handleFormMultiInputChange,
  handleGridRowClick,
  onExcelUpload,
  handleFormElementApiCall
}) => {
  const setSelectedRow = useBuilderStore((state) => state.setSelectedRow);

  if (!part) return null;
  const { type, data, nodeId, linkData } = part; // part에서 데이터 추출

  if (type === 'iframe') {
    return (
      <div className={`${styles.message} ${styles.botMessage} ${styles.iframeContainer}`}>
        <iframe
          src={interpolateMessage(data.url, slots)}
          width={data.width || '100%'}
          height={data.height || '250'}
          style={{ border: 'none', borderRadius: '18px' }}
          title="chatbot-iframe"
        ></iframe>
      </div>
    );
  }

  if (type === 'link') {
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
      <div className={styles.formContainer} style={{ width: '100%' }}>
        <h3>{interpolateMessage(data.title, slots)}</h3>
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
          // --- 💡 [수정] Grid 렌더링 로직 (숨김 처리) ---
          if (el.type === 'grid') {
            // 💡 수정: getNestedValue를 사용하여 슬롯 이름(경로)으로 실제 데이터를 가져옵니다.
            const gridDataFromSlot = el.optionsSlot ? slots[el.optionsSlot] : null;
            const hasSlotData = Array.isArray(gridDataFromSlot) && gridDataFromSlot.length > 0;

            if (hasSlotData) {
              // 1. 슬롯에 데이터가 있으면 (검색 후) -> 그리드 렌더링
              const isDynamicObjectArray = typeof gridDataFromSlot[0] === 'object' && gridDataFromSlot[0] !== null && !Array.isArray(gridDataFromSlot[0]);
              if (isDynamicObjectArray) {
                // 1. displayKeys가 정의되었는지 확인
                const hasDisplayKeys = el.displayKeys && el.displayKeys.length > 0;

                // 2. keyObject 배열 생성 (데이터 호환성 보장)
                const keyObjects = (hasDisplayKeys ? el.displayKeys : Object.keys(gridDataFromSlot[0] || {}))
                  .map(k => {
                    if (typeof k === 'string') return { key: k, label: k };
                    if (k && typeof k === 'object' && k.key) return k;
                    return null;
                  }).filter(Boolean);

                // 3. 'hideNullColumns' 적용
                const filteredKeyObjects = el.hideNullColumns
                  ? keyObjects.filter(kObj => gridDataFromSlot.some(obj => obj[kObj.key] !== null && obj[kObj.key] !== undefined && obj[kObj.key] !== ""))
                  : keyObjects;

                return (
                  <div key={el.id} style={{ overflowX: 'auto' }}>
                    <table className={styles.formGridTable}>
                      <thead>
                        <tr>
                          {filteredKeyObjects.map(kObj => <th key={kObj.key}>{interpolateMessage(kObj.label, slots)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {gridDataFromSlot.map((dataObject, index) => (
                          <tr key={`${el.id}-${index}`} onClick={() => !isCompleted && handleGridRowClick(dataObject, el)}>
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
                // (이 부분은 문자열 배열 데이터용 - 현재 사용되지 않을 수 있음)
                const rows = gridDataFromSlot.length;
                const columns = gridDataFromSlot[0]?.length || 0;
                return (
                  <table key={el.id} className={styles.formGridTable}>
                    <tbody>
                      {[...Array(rows)].map((_, r) => (
                        <tr key={r}>
                          {[...Array(columns)].map((_, c) => {
                            const cellValue = gridDataFromSlot[r] ? gridDataFromSlot[r][c] : '';
                            return <td key={c}>{interpolateMessage(cellValue || '', slots)}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }
            } else if (el.optionsSlot) {
              // 2. 슬롯이 설정되었지만 데이터가 없음 (검색 전 / 행 클릭 후) -> 그리드 숨김
              return null;
            } else {
              // 3. 슬롯이 설정되지 않음 (정적 그리드) -> 정적 데이터로 렌더링
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
                          return <td key={c}>{interpolateMessage(cellValue || '', slots)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }
          }

          // input, date, dropbox, checkbox의 현재 값과 기본값을 별도로 계산
          let currentValue = '';
          let resolvedDefaultValue = '';

          if (el.type === 'input') {
            const defaultValueConfig = el.defaultValue || '';
            resolvedDefaultValue = interpolateMessage(defaultValueConfig, slots);
            currentValue = formData[el.name] ?? resolvedDefaultValue;
          } else if (el.type === 'date' || el.type === 'dropbox') {
            currentValue = formData[el.name] ?? el.defaultValue ?? '';
          } else if (el.type === 'checkbox') {
            currentValue = formData[el.name] ?? el.defaultValue ?? [];
          }

          return (
            <div key={el.id} className={styles.formElement}>
              <label className={styles.formLabel}>{interpolateMessage(el.label, slots)}</label>

              {/* input: 'defaultValue' -> 'value'로 변경, onDoubleClick 추가 */}
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

              {/* date: 'value'에 currentValue 사용 (기존: formData[el.name] || '') */}
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

              {/* checkbox: 'checked'에 currentValue 사용 */}
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

              {/* dropbox: 'value'에 currentValue 사용 */}
              {el.type === 'dropbox' && (() => {
                // 💡 수정: getNestedValue를 사용하여 중첩 경로를 지원합니다.
                const options = Array.isArray(getNestedValue(slots, el.optionsSlot)) ? getNestedValue(slots, el.optionsSlot) : el.options;
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

              {el.type === 'search' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder={interpolateMessage(el.placeholder, slots)}
                    value={formData[el.name] ?? ''}
                    onChange={(e) => handleFormInputChange(el.name, e.target.value)}
                    disabled={isCompleted}
                    style={{ flexGrow: 1 }}
                  />
                  <button
                    onClick={() => handleFormElementApiCall(el)}
                    disabled={isCompleted}
                    className={styles.formSubmitButton}
                    style={{ padding: '8px 12px', margin: 0, flexShrink: 0, lineHeight: 1 }}
                  >
                    🔍
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!hasSlotBoundGrid && (
          <div className={styles.formButtonContainer}>
            {/* 엑셀 업로드 버튼 */}
            {data.enableExcelUpload && !isCompleted && (
              <button className={styles.formExcelButton} onClick={onExcelUpload} disabled={isCompleted}>
                Excel Upload
              </button>
            )}
            <button className={styles.formSubmitButton} onClick={onFormSubmit} disabled={isCompleted}>Submit</button>
          </div>
        )}
      </div>
    );
  }

  const message = interpolateMessage(data.content || data.label, slots);
  return (
    // 래핑 div 변경 및 스타일 조정
    <div style={{ width: '100%' }}>
      <div>{message}</div>
      {type === 'branch' && data.evaluationType === 'BUTTON' && (
        <div className={styles.branchButtonsContainer}>
          {data.replies?.map(reply => <button key={reply.value} className={styles.branchButton} onClick={() => onOptionClick(reply)} disabled={isCompleted}>{interpolateMessage(reply.display, slots)}</button>)}
        </div>
      )}
      {/* slotfilling 버튼 렌더링 */}
      {type === 'slotfilling' && data.replies && data.replies.length > 0 && (
        <div className={styles.branchButtonsContainer}>
          {data.replies.map(reply => <button key={reply.value} className={styles.branchButton} onClick={() => onOptionClick(reply)} disabled={isCompleted}>{interpolateMessage(reply.display, slots)}</button>)}
        </div>
      )}
    </div>
  );
};

// onExcelUpload prop 추가

const MessageRenderer = ({ 
    item, 
    nodes, 
    onOptionClick, 
    handleFormSubmit, 
    handleFormDefault, 
    formData, 
    handleFormInputChange, 
    handleFormMultiInputChange, 
    handleGridRowClick, 
    onExcelUpload,
    handleFormElementApiCall
}) => {
  const slots = useBuilderStore((state) => state.slots);
  const historyRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [item]);

  switch (item.type) {
    case 'bot_streaming':
      return (
        <div className={styles.messageRow}>
          <img src={item.isStreaming ? "/images/avatar-loading.png" : "/images/avatar.png"} alt="Avatar" className={styles.avatar} />
          <div className={`${styles.message} ${styles.botMessage}`}>{item.content}</div>
        </div>
      );
    case 'loading':
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
                  // prop 이름 변경 (handleFormSubmit -> onFormSubmit)
                  onFormSubmit={handleFormSubmit}
                  onFormDefault={handleFormDefault}
                  // 마지막 파트만 isCompleted를 따르도록 수정
                  isCompleted={index < item.combinedData.length - 1 ? true : item.isCompleted}
                  formData={formData}
                  handleFormInputChange={handleFormInputChange}
                  handleFormMultiInputChange={handleFormMultiInputChange}
                  handleGridRowClick={handleGridRowClick}
                  onExcelUpload={onExcelUpload}
                  handleFormElementApiCall={handleFormElementApiCall}
                />
              ))}
            </div>
          </div>
        );
      }
      return null;
    case 'user':
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