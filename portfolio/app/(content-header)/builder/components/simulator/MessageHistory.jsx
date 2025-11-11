// src/components/simulator/MessageHistory.jsx

import React, { useRef, useEffect } from 'react';
import MessageRenderer from './MessageRenderer';
import styles from '../ChatbotSimulator.module.css';

// 💡 [수정된 부분] handleGridRowClick, onExcelUpload 프롭 추가
const MessageHistory = ({ history, nodes, onOptionClick, handleFormSubmit, handleFormDefault, formData, handleFormInputChange, handleFormMultiInputChange, handleGridRowClick, onExcelUpload }) => {
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
          handleGridRowClick={handleGridRowClick} // 💡 [수정된 부분]
          onExcelUpload={onExcelUpload} // <<< [추가]
        />
      ))}
    </div>
  );
};

export default MessageHistory;