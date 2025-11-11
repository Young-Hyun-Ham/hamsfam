
import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function DelayNodeController({ localNode, setLocalNode }) {
  const { data } = localNode;
  // 3. 훅 사용
  const { handleLocalDataChange } = useNodeController(setLocalNode);

  // 4. duration의 특수 로직(숫자 변환)을 위한 별도 핸들러
  const handleDurationChange = (value) => {
    const numericValue = parseInt(value, 10);
    const validValue = numericValue >= 0 ? numericValue : 0;
    handleLocalDataChange('duration', validValue); // 훅 함수 사용
  };

  return (
    <>
      <div className={styles.formGroup}>
        <label>Delay Duration (milliseconds)</label>
        <input
          type="number"
          value={data.duration || 0}
          onChange={(e) => handleDurationChange(e.target.value)} // 5. 별도 핸들러 연결
          min="0" // 음수 입력 방지
        />
        <p className={styles.instructionText} style={{ marginTop: '4px', fontSize: '0.75rem' }}>
          Enter the time in milliseconds (e.g., 1000 for 1 second).
        </p>
      </div>
      {/* 6. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)} // 훅 함수 사용
      />
    </>
  );
}

export default DelayNodeController;