
import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function SetSlotNodeController({ localNode, setLocalNode }) {
  const { data } = localNode;
  // 3. 훅 사용 및 로컬 함수 제거
  const { handleLocalDataChange } = useNodeController(setLocalNode);

  // 4. 훅의 handleLocalDataChange를 사용하도록 수정
  const handleAssignmentChange = (index, part, value) => {
    const newAssignments = [...(data.assignments || [])];
    newAssignments[index] = { ...newAssignments[index], [part]: value };
    handleLocalDataChange('assignments', newAssignments); // 훅 함수 사용
  };

  const addAssignment = () => {
    const newAssignment = { key: '', value: '' };
    const newAssignments = [...(data.assignments || []), newAssignment];
    handleLocalDataChange('assignments', newAssignments); // 훅 함수 사용
  };

  const deleteAssignment = (index) => {
    const newAssignments = (data.assignments || []).filter((_, i) => i !== index);
    handleLocalDataChange('assignments', newAssignments); // 훅 함수 사용
  };

  return (
    <>
      <div className={styles.formGroup}>
        <label>Slot Assignments</label>
        <p className={styles.instructionText} style={{ marginTop: 0, fontSize: '0.8rem' }}>
          Set or update slot values. You can use existing slot values in the 'Value' field with {`{slotName}`}.
        </p>
        <div className={styles.repliesContainer}>
          {(data.assignments || []).map((assign, index) => (
            <div key={index} className={styles.quickReply}>
              <input
                className={styles.quickReplyInput}
                value={assign.key}
                onChange={(e) => handleAssignmentChange(index, 'key', e.target.value)}
                placeholder="Slot Key"
              />
              <input
                className={styles.quickReplyInput}
                value={assign.value}
                onChange={(e) => handleAssignmentChange(index, 'value', e.target.value)}
                placeholder="Value"
              />
              <button onClick={() => deleteAssignment(index)} className={styles.deleteReplyButton}>×</button>
            </div>
          ))}
          <button onClick={addAssignment} className={styles.addReplyButton}>
            + Add Assignment
          </button>
        </div>
      </div>
      {/* 5. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)}
      />
    </>
  );
}

export default SetSlotNodeController;