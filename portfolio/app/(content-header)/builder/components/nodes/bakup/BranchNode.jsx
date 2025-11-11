import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import { useBuilderStore } from '../../store/index-bak';
import { AnchorIcon, StartNodeIcon } from '../icons/Icons';

function BranchNode({ id, data }) {
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const anchorNodeId = useBuilderStore((state) => state.anchorNodeId);
  const setAnchorNodeId = useBuilderStore((state) => state.setAnchorNodeId);
  const startNodeId = useBuilderStore((state) => state.startNodeId); // <<< [추가]
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId); // <<< [추가]
  const nodeColor = useBuilderStore((state) => state.nodeColors.branch);
  const textColor = useBuilderStore((state) => state.nodeTextColors.branch);

  const isConditionType = data.evaluationType === 'CONDITION';
  const isAnchored = anchorNodeId === id;
  const isStartNode = startNodeId === id; // <<< [추가]

  return (
    // <<< [수정] isStartNode 클래스 추가 >>>
    <div className={`${styles.nodeWrapper} ${isAnchored ? styles.anchored : ''} ${isStartNode ? styles.startNode : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <span className={styles.headerTextContent}>Condition Branch</span>
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
          <span className={styles.sectionTitle}>Branch Text</span>
          <textarea
            className={styles.textInput}
            value={data.content || ''}
            readOnly
            rows={4}
          />
        </div>
        <div className={styles.section}>
          <span className={styles.sectionTitle}>
            Branches ({isConditionType ? 'Conditions' : 'Buttons'})
          </span>
          <div className={styles.branchOptionsContainer}>
            {isConditionType ? (
              (data.conditions?.length || 0) > 0 ? (
                data.conditions.map((cond, index) => (
                  <div key={cond.id || index} className={styles.branchOption}>
                    <span className={styles.branchOptionButton}>
                      {`{${cond.slot}} ${cond.operator} ${cond.valueType === 'slot' ? `{${cond.value}}` : `'${cond.value}'`}`}
                    </span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={data.replies?.[index]?.value}
                      style={{ top: '50%', transform: 'translateY(-50%)', right: '-25px', background: '#555' }}
                    />
                  </div>
                ))
              ) : (
                <div className={styles.formElementsPlaceholder}>No conditions added.</div>
              )
            ) : (
              (data.replies?.length || 0) > 0 ? (
                data.replies.map((reply, index) => (
                  <div key={reply.value} className={styles.branchOption}>
                    <span className={styles.branchOptionButton}>{reply.display}</span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={reply.value}
                      style={{ top: '50%', transform: 'translateY(-50%)', right: '-25px', background: '#555' }}
                    />
                  </div>
                ))
              ) : (
                 <div className={styles.formElementsPlaceholder}>No buttons added.</div>
              )
            )}
          </div>
        </div>
      </div>
       {/* Default Handle for Condition Type */}
       {isConditionType && (
           <>
             <Handle
               type="source"
               position={Position.Right}
               id="default"
               style={{ bottom: 15, top: 'auto', background: '#e74c3c' }}
             />
             <div style={{ position: 'absolute', bottom: 10, right: -45, fontSize: '11px', color: '#e74c3c' }}>
               Default
             </div>
           </>
       )}
    </div>
  );
}

export default BranchNode;