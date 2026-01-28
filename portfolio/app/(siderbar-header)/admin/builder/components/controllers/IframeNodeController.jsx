
import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function IframeNodeController({ localNode, setLocalNode }) {
  const { data } = localNode;
  // 3. 훅 사용 및 로컬 함수 제거
  const { handleLocalDataChange } = useNodeController(setLocalNode);

  return (
    <>
      <div className={styles.formGroup}>
        <label>URL</label>
        <textarea
          value={data.url || ''}
          onChange={(e) => handleLocalDataChange('url', e.target.value)}
          rows={3}
        />
      </div>
      <div className={styles.gridControls}>
        <div className={styles.formGroup}>
          <label>Width (px)</label>
          <input
            type="number"
            value={data.width || ''}
            onChange={(e) => handleLocalDataChange('width', e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Height (px)</label>
          <input
            type="number"
            value={data.height || ''}
            onChange={(e) => handleLocalDataChange('height', e.target.value)}
          />
        </div>
      </div>
      {/* 4. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)}
      />
    </>
  );
}

export default IframeNodeController;