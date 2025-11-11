import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import { useBuilderStore } from '../../store/index-bak';
import { AnchorIcon, StartNodeIcon } from '../icons/Icons';

function SlotFillingNode({ id, data }) {
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const anchorNodeId = useBuilderStore((state) => state.anchorNodeId);
  const setAnchorNodeId = useBuilderStore((state) => state.setAnchorNodeId);
  const startNodeId = useBuilderStore((state) => state.startNodeId); // <<< [추가]
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId); // <<< [추가]
  const nodeColor = useBuilderStore((state) => state.nodeColors.slotfilling);
  const textColor = useBuilderStore((state) => state.nodeTextColors.slotfilling);

  const isAnchored = anchorNodeId === id;
  const isStartNode = startNodeId === id; // <<< [추가]

  return (
    // <<< [수정] isStartNode 클래스 추가 >>>
    <div className={`${styles.nodeWrapper} ${isAnchored ? styles.anchored : ''} ${isStartNode ? styles.startNode : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <span className={styles.headerTextContent}>SlotFilling</span>
        <div className={styles.headerButtons}>
             {/* <<< [추가] 시작 노드 설정 버튼 >>> */}
            <button
              onClick={(e) => { e.stopPropagation(); setStartNodeId(id); }}
              className={`${styles.startNodeButton} ${isStartNode ? styles.active : ''}`}
              title="Set as Start Node"
            >
              <StartNodeIcon />
            </button>
            {/* <<< [추가 끝] >>> */}
            <button
              onClick={(e) => { e.stopPropagation(); setAnchorNodeId(id); }}
              className={`${styles.anchorButton} ${isAnchored ? styles.active : ''}`}
              title="Set as anchor"
            >
              <AnchorIcon />
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteNode(id); }} className={styles.deleteButton} style={{ backgroundColor: nodeColor, color: textColor }}>X</button>
        </div>
      </div>
      <div className={styles.nodeBody}>
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
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
export default SlotFillingNode;