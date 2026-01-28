
import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function ToastNodeController({ localNode, setLocalNode }) {
  const { data } = localNode;
  // 3. 훅 사용 및 로컬 함수 제거
  const { handleLocalDataChange } = useNodeController(setLocalNode);

  return (
    <>
      <div className={styles.formGroup}>
        <label>Toast Message</label>
        <textarea
          value={data.message || ''}
          onChange={(e) => handleLocalDataChange('message', e.target.value)}
          rows={4}
        />
      </div>
      <div className={styles.formGroup}>
        <label>Toast Type</label>
        <select
          value={data.toastType || 'info'}
          onChange={(e) => handleLocalDataChange('toastType', e.target.value)}
        >
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
      </div>
      {/* 4. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)}
      />
    </>
  );
}

export default ToastNodeController;