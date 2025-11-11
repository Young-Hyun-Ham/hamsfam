
import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function LlmNodeController({ localNode, setLocalNode }) {
  const { data } = localNode;
  // 3. 훅 사용 및 로컬 함수 제거
  const { handleLocalDataChange } = useNodeController(setLocalNode);

  // 4. 훅의 handleLocalDataChange를 사용하도록 수정
  const handleLlmConditionChange = (index, value) => {
    const newConditions = [...(data.conditions || [])];
    newConditions[index] = { ...newConditions[index], keyword: value };
    handleLocalDataChange('conditions', newConditions); // 훅 함수 사용
  };

  const addLlmCondition = () => {
    const newCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      keyword: 'New Keyword',
    };
    const newConditions = [...(data.conditions || []), newCondition];
    handleLocalDataChange('conditions', newConditions); // 훅 함수 사용
  };

  const deleteLlmCondition = (index) => {
    const newConditions = (data.conditions || []).filter((_, i) => i !== index);
    handleLocalDataChange('conditions', newConditions); // 훅 함수 사용
  };

  return (
    <>
      {/* 5. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)}
      />
      <div className={styles.formGroup}>
        <label>Prompt</label>
        <textarea
          value={data.prompt || ''}
          onChange={(e) => handleLocalDataChange('prompt', e.target.value)}
          rows={8}
        />
      </div>
      <div className={styles.formGroup}>
        <label>Output Variable</label>
        <input
          type="text"
          value={data.outputVar || ''}
          onChange={(e) => handleLocalDataChange('outputVar', e.target.value)}
          placeholder="Variable to store LLM output"
        />
      </div>
      <div className={styles.separator} />
      <div className={styles.formGroup}>
        <label>Conditions (Branching)</label>
        <div className={styles.repliesContainer}>
          {(data.conditions || []).map((cond, index) => (
            <div key={cond.id} className={styles.quickReply}>
              <input
                className={styles.quickReplyInput}
                value={cond.keyword}
                onChange={(e) => handleLlmConditionChange(index, e.target.value)}
                placeholder="Keyword to match"
              />
              <button onClick={() => deleteLlmCondition(index)} className={styles.deleteReplyButton}>×</button>
            </div>
          ))}
          <button onClick={addLlmCondition} className={styles.addReplyButton}>
            + Add Condition
          </button>
        </div>
      </div>
    </>
  );
}

export default LlmNodeController;