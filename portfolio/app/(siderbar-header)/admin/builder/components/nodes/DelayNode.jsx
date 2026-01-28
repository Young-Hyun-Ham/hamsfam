// src/nodes/DelayNode.jsx

// (Handle, Position 임포트 제거)
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
import { DelayNodeIcon } from '../icons/Icons';
import NodeWrapper from './NodeWrapper';

// (AnchorIcon, StartNodeIcon 임포트 제거)

function DelayNode({ id, data }) {
  // 3. 공통 로직 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.delay) || '#f1c40f';
  const textColor = useBuilderStore((state) => state.nodeTextColors.delay) || '#333333';

  // (isAnchored, isStartNode 로직 제거)

  return (
    // 4. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="Delay"
      icon={<DelayNodeIcon />} // 5. 아이콘 전달
      nodeColor={nodeColor}
      textColor={textColor}
    >
      {/* 6. 기존 nodeBody의 내용만 children으로 전달 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Duration</span>
        <div className={styles.previewBox} style={{ textAlign: 'center' }}>
          {data.duration || 0} ms
        </div>
      </div>
    </NodeWrapper>
  );
}

export default DelayNode;