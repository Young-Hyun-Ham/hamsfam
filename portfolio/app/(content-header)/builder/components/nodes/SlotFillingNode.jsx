import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
import NodeWrapper from './NodeWrapper'; // 1. Wrapper 임포트

// (AnchorIcon, StartNodeIcon 임포트 제거)
// (Handle, Position 임포트 제거)

function SlotFillingNode({ id, data }) {
  // 2. 공통 로직 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.slotfilling);
  const textColor = useBuilderStore((state) => state.nodeTextColors.slotfilling);

  // (isAnchored, isStartNode 로직 제거)

  return (
    // 3. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="SlotFilling"
      icon={null} // (SlotFillingNode는 아이콘이 없었음)
      nodeColor={nodeColor}
      textColor={textColor}
    >
      {/* 4. 기존 nodeBody의 내용만 children으로 전달 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Question</span>
        <textarea
          className={styles.textInput}
          value={data.content}
          readOnly
          rows={2}
        />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Slot:</span>
        <input
          className={styles.textInput}
          value={data.slot}
          readOnly
        />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Quick Replies:</span>
        {data.replies?.map((reply) => (
          <div key={reply.value} className={styles.quickReply}>
             <input
              className={styles.quickReplyInput}
              value={reply.display}
              readOnly
              placeholder="Display text"
            />
            <input
              className={styles.quickReplyInput}
              value={reply.value}
              readOnly
              placeholder="Actual value"
            />
          </div>
        ))}
        {(data.replies?.length === 0) && (
           <div className={styles.formElementsPlaceholder}>No replies added.</div>
        )}
      </div>
    </NodeWrapper>
  );
}
export default SlotFillingNode;