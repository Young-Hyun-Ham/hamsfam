import React from 'react';
import styles from './ApiTemplateModal.module.css'; // 기존 모달 스타일 재사용

function ScenarioGroupModal({ isOpen, onClose, scenarios, onSelect }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2>Import Scenario as Group</h2>
        <p className={styles.instructionText}>Select a scenario to import its content as a group node.</p>
        
        <div className={styles.templateList}>
          {scenarios.length > 0 ? (
            scenarios.map((scenario) => (
              <div key={scenario.id} className={styles.templateItem}>
                <span>{scenario.name}</span>
                <div className={styles.buttonGroup}>
                  <button onClick={() => onSelect(scenario)} className={styles.loadButton}>Import</button>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.placeholder}>No scenarios available to import.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScenarioGroupModal;