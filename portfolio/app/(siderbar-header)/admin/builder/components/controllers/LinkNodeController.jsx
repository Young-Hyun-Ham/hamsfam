
import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function LinkNodeController({ localNode, setLocalNode }) {
  const { data } = localNode;
  const { handleLocalDataChange } = useNodeController(setLocalNode);

  return (
    <>
      <div className={styles.formGroup}>
        <label>URL</label>
        <textarea value={data.content || ''} onChange={(e) => handleLocalDataChange('content', e.target.value)} rows={3} />
      </div>
      <div className={styles.formGroup}>
        <label>Display Text</label>
        <input type="text" value={data.display || ''} onChange={(e) => handleLocalDataChange('display', e.target.value)} />
      </div>
      {/* 2. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)}
      />
    </>
  );
}

export default LinkNodeController;