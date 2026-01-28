import React from 'react';
import styles from '../ChatbotSimulator.module.css';
import { ExpandIcon, CollapseIcon } from '../icons/Icons';

const SimulatorHeader = ({ isVisible, isExpanded, setIsExpanded, onStart }) => {
  return (
    <div className={`${styles.header} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.headerContent}>
        <img src="/images/icon.png" alt="AI Chatbot Icon" className={styles.headerIcon} />
        <div className={styles.headerTextContainer}>
          <span className={styles.headerTitle}>AI ChatBot</span>
          <span className={styles.headerSubtitle}>Booking Master</span>
        </div>
      </div>
      <div className={styles.headerButtons}>
        {isVisible && (
          <div className={styles.headerButton} onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Collapse" : "Expand"}>
            <img src="/images/expand.png" alt="expand" className={!isExpanded ? styles.expandIcon : styles.collapseIcon} />
          </div>
        )}
        {isVisible && (
          <button className={styles.headerRestartButton} onClick={onStart}>
            Start
          </button>
        )}
      </div>
    </div>
  );
};

export default SimulatorHeader;