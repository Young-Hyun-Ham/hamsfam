import React, { useState } from 'react';
import useBuilderStore from '../store/index';
import styles from './SlotDisplay.module.css';

function SlotDisplay() {
  const slots = useBuilderStore((state: any) => state.slots);
  const selectedRow = useBuilderStore((state: any) => state.selectedRow);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasSlots = Object.keys(slots).length > 0;
  const hasSelectedRow = selectedRow !== null;

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const renderValue = (value: any) => {
    // 💡 객체나 배열인 경우 바로 pretty-print 처리합니다.
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className={styles.prettyJson}>
          <code>{JSON.stringify(value, null, 2)}</code>
        </pre>
      );
    }

    // 💡 문자열인 경우 JSON 파싱을 시도합니다.
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        // 파싱에 성공하면 객체이므로 pretty-print 처리합니다.
        return (
          <pre className={styles.prettyJson}>
            <code>{JSON.stringify(parsed, null, 2)}</code>
          </pre>
        );
      } catch (e) {
        // JSON 문자열이 아니면 일반 텍스트로 표시합니다.
        return <span>{value}</span>;
      }
    }

    // 💡 그 외(숫자, boolean 등)는 문자열로 변환하여 표시합니다.
    return <span>{String(value)}</span>;
  };

  return (
    <div className={`${styles.slotDisplayContainer} ${isCollapsed ? styles.collapsed : ''}`}>
      <h4 className={styles.title} onClick={toggleCollapse}>
        Current Values {/* 제목 수정 */}
        <span className={styles.toggleIcon}>{isCollapsed ? '▶' : '▼'}</span>
      </h4>
      {!isCollapsed && (
        (hasSlots || hasSelectedRow) ? ( // <<< [수정] selectedRow 유무도 체크
          <div className={styles.slotList}>
            {Object.entries(slots).map(([key, value]) => (
              <div key={key} className={styles.slotItem}>
                <span className={styles.slotKey}>{key}:</span>
                <div className={styles.slotValue}>{renderValue(value)}</div>
              </div>
            ))}
            {/* --- 👇 [추가] selectedRow 표시 --- */}
            {hasSelectedRow && (
              <div key="selectedRow" className={styles.slotItem} style={{borderTop: '1px dashed #ccc', paddingTop: '8px'}}>
                <span className={styles.slotKey} style={{color: '#e74c3c'}}>selectedRow:</span>
                <div className={styles.slotValue}>{renderValue(selectedRow)}</div>
              </div>
            )}
            {/* --- 👆 [추가 끝] --- */}
          </div>
        ) : (
          <p className={styles.placeholder}>No values set yet.</p> // <<< [수정]
        )
      )}
    </div>
  );
}

export default SlotDisplay;