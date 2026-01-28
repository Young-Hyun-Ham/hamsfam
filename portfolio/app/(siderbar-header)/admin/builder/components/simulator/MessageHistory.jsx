// app/(siderbar-header)/admin/builder/components/simulator/MessageHistory.jsx

import React, { useRef, useEffect } from 'react';
import MessageRenderer from './MessageRenderer';
import styles from '../ChatbotSimulator.module.css';

// 💡 [수정된 부분] handleGridRowClick, onExcelUpload 프롭 추가
// 💡 [수정] handleFormElementApiCall prop 받기
const MessageHistory = ({
  history,
  nodes,
  onOptionClick,
  handleFormSubmit,
  handleFormDefault,
  formData,
  handleFormInputChange,
  handleFormMultiInputChange,
  handleGridRowClick,
  onExcelUpload,
  handleFormElementApiCall // 💡 [수정]
}) => {
  const historyRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className={styles.history} ref={historyRef}>
      {history.map((item, index) => (
        <MessageRenderer
          key={item.id || index}
          item={item}
          nodes={nodes}
          onOptionClick={onOptionClick}
          handleFormSubmit={handleFormSubmit}
          handleFormDefault={handleFormDefault}
          formData={formData}
          handleFormInputChange={handleFormInputChange}
          handleFormMultiInputChange={handleFormMultiInputChange}
          handleGridRowClick={handleGridRowClick}
          onExcelUpload={onExcelUpload}
          handleFormElementApiCall={handleFormElementApiCall} // 💡 [수정] prop 전달
        />
      ))}
    </div>
  );
};

export default MessageHistory;