import React, { useState } from 'react';
import styles from '../ChatbotSimulator.module.css';
import { AttachIcon } from '../icons/Icons';
import { useDraggableScroll } from '../controllers/hooks/useDraggableScroll';

const UserInput = ({ currentNode, isStarted, onTextInputSend, onOptionClick }) => {
  const [inputValue, setInputValue] = useState('');
  const quickRepliesSlider = useDraggableScroll();

  const handleSend = () => {
    if (inputValue.trim()) {
      onTextInputSend(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className={styles.options}>
      <div className={styles.inputRow}>
        <div className={styles.inputArea}>
          <input
            type="text"
            className={styles.textInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this Booking Master Page"
            disabled={!isStarted}
          />
        </div>
      </div>
      <div className={styles.buttonRow}>
        <button className={styles.attachButton}><AttachIcon /></button>
        <div
          ref={quickRepliesSlider.ref}
          className={`${styles.quickRepliesContainer} ${quickRepliesSlider.isDragging ? styles.dragging : ''}`}
          onMouseDown={quickRepliesSlider.onMouseDown}
          onMouseLeave={quickRepliesSlider.onMouseLeave}
          onMouseUp={quickRepliesSlider.onMouseUp}
          onMouseMove={quickRepliesSlider.onMouseMove}
        >
          {isStarted && currentNode?.data.replies?.length > 0 &&
            (currentNode.type === 'message' || currentNode.type === 'slotfilling') &&
            currentNode.data.replies.map((answer) => (
              <button key={answer.value} className={styles.optionButton} onClick={() => onOptionClick(answer)}>
                {answer.display}
              </button>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default UserInput;