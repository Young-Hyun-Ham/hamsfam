import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function MessageNodeController({ localNode, setLocalNode }) {
  const { data } = localNode;
  const { handleLocalDataChange, addReply, updateReply, deleteReply } = useNodeController(setLocalNode);

  return (
    <>
      <div className={styles.formGroup}>
        <label>Content</label>
        <textarea value={data.content || ''} onChange={(e) => handleLocalDataChange('content', e.target.value)} rows={4} />
      </div>
      <div className={styles.formGroup}>
        <label>Quick Replies</label>
        <div className={styles.repliesContainer}>
          {data.replies?.map((reply, index) => (
            <div key={reply.value || index} className={styles.quickReply}>
              <input
                className={styles.quickReplyInput}
                value={reply.display}
                onChange={(e) => updateReply(index, 'display', e.target.value)}
                placeholder="Display text"
              />
              <input
                className={styles.quickReplyInput}
                value={reply.value}
                onChange={(e) => updateReply(index, 'value', e.target.value)}
                placeholder="Actual value"
              />
              <button onClick={() => deleteReply(index)} className={styles.deleteReplyButton}>×</button>
            </div>
          ))}
          <button onClick={addReply} className={styles.addReplyButton}>
            + Add Reply
          </button>
        </div>
      </div>
      {/* 2. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)}
      />
    </>
  );
}

export default MessageNodeController;