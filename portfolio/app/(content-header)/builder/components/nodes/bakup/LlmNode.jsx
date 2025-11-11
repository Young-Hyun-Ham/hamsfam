import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import { useBuilderStore } from '../../store/index-bak';
import { AnchorIcon, StartNodeIcon } from '../icons/Icons';

function LlmNode({ id, data }) {
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const anchorNodeId = useBuilderStore((state) => state.anchorNodeId);
  const setAnchorNodeId = useBuilderStore((state) => state.setAnchorNodeId);
  const startNodeId = useBuilderStore((state) => state.startNodeId); // <<< [추가]
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId); // <<< [추가]
  const updateNodeData = useBuilderStore((state) => state.updateNodeData); // updateNodeData는 이미 있음
  const nodeColor = useBuilderStore((state) => state.nodeColors.llm);
  const textColor = useBuilderStore((state) => state.nodeTextColors.llm);

  const isAnchored = anchorNodeId === id;
  const isStartNode = startNodeId === id; // <<< [추가]

  const onOutputVarChange = (e) => {
    // This function might not be directly used if editing happens only in the controller
    // but kept for potential future direct editing on the node.
    updateNodeData(id, { outputVar: e.target.value });
  };

  return (
    // <<< [수정] isStartNode 클래스 추가 >>>
    <div className={`${styles.nodeWrapper} ${isAnchored ? styles.anchored : ''} ${isStartNode ? styles.startNode : ''}`}>
      <Handle type="target" position={Position.Left} />

      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <span className={styles.headerTextContent}>LLM</span>
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
          <span className={styles.sectionTitle}>Prompt</span>
          <textarea
            className={styles.textInput}
            value={data.prompt}
            readOnly
            rows={3}
          />
        </div>
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Output Variable</span>
          <input
            type="text"
            className={styles.textInput}
            value={data.outputVar || ''}
            // onChange={onOutputVarChange} // Typically handled in NodeController
            readOnly // Editable in Controller
          />
        </div>
        {/* ▼▼▼▼▼ 조건 분기 표시 UI ▼▼▼▼▼ */}
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Conditions:</span>
          <div className={styles.branchOptionsContainer}>
            {data.conditions?.map((cond, index) => (
              <div key={cond.id} className={styles.branchOption}>
                <span className={styles.branchOptionButton}>{cond.keyword}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={cond.id}
                  // Adjust handle positioning based on the number of conditions
                  style={{ top: `${(index + 1) / ( (data.conditions?.length || 0) + 2) * 100}%`, background: '#555' }}
                />
              </div>
            ))}
             {(data.conditions?.length === 0) && (
                <div className={styles.formElementsPlaceholder}>No conditions added.</div>
             )}
          </div>
        </div>
        {/* ▲▲▲▲▲ 조건 분기 표시 UI ▲▲▲▲▲ */}
      </div>

      {/* 기본 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        // Adjust default handle position based on number of conditions
        style={{ top: `${( (data.conditions?.length || 0) + 1) / ( (data.conditions?.length || 0) + 2) * 100}%`, background: '#e74c3c' }}

      />
       <div style={{ position: 'absolute', bottom: 10, right: -45, fontSize: '11px', color: '#e74c3c' }}>
        Default
      </div>
    </div>
  );
}

export default LlmNode;