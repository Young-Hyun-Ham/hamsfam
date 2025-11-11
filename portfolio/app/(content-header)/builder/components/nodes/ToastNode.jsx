// (Handle, Position 임포트 제거)
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
import { ToastIcon } from '../icons/Icons';
import NodeWrapper from './NodeWrapper';

function ToastNode({ id, data }) {
  // 3. 공통 로직 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.toast);
  const textColor = useBuilderStore((state) => state.nodeTextColors.toast);

  // (isAnchored, isStartNode 로직 제거)

  return (
    // 4. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="Toast"
      icon={<ToastIcon />} // 5. 아이콘 전달
      nodeColor={nodeColor}
      textColor={textColor}
    >
      {/* 6. 기존 nodeBody의 내용만 children으로 전달 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Message</span>
        <textarea
          className={styles.textInput}
          value={data.message || ''}
          readOnly
          rows={3}
        />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Type</span>
         <input
          type="text"
          className={styles.textInput}
          value={data.toastType || 'info'}
          readOnly // Controller에서 수정
        />
      </div>
    </NodeWrapper>
  );
}

export default ToastNode;