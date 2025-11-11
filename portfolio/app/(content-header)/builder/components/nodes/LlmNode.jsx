import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
// (AnchorIcon, StartNodeIcon 임포트 제거)
import NodeWrapper from './NodeWrapper'; // 1. Wrapper 임포트

function LlmNode({ id, data }) {
  // 2. 공통 로직 제거
  // (updateNodeData는 현재 사용되지 않으므로 제거)
  const nodeColor = useBuilderStore((state) => state.nodeColors.llm);
  const textColor = useBuilderStore((state) => state.nodeTextColors.llm);

  // (isAnchored, isStartNode 로직 제거)

  // 3. Wrapper에 전달할 커스텀 핸들 정의
  const customHandles = (
    <>
      {data.conditions?.map((cond, index) => (
        <Handle
          key={cond.id}
          type="source"
          position={Position.Right}
          id={cond.id}
          style={{ top: `${(index + 1) / ((data.conditions?.length || 0) + 2) * 100}%`, background: '#555' }}
        />
      ))}
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        style={{ top: `${((data.conditions?.length || 0) + 1) / ((data.conditions?.length || 0) + 2) * 100}%`, background: '#e74c3c' }}
      />
      <div style={{ position: 'absolute', bottom: 10, right: -45, fontSize: '11px', color: '#e74c3c' }}>
        Default
      </div>
    </>
  );

  return (
    // 4. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="LLM"
      icon={null} // (LlmNode는 아이콘이 없었음)
      nodeColor={nodeColor}
      textColor={textColor}
      handles={customHandles} // 커스텀 핸들 전달
    >
      {/* 5. 기존 nodeBody의 내용만 children으로 전달 */}
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
          readOnly
        />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Conditions:</span>
        <div className={styles.branchOptionsContainer}>
          {data.conditions?.map((cond, index) => (
            <div key={cond.id} className={styles.branchOption}>
              <span className={styles.branchOptionButton}>{cond.keyword}</span>
              {/* 핸들은 customHandles에서 이미 정의됨 */}
            </div>
          ))}
           {(data.conditions?.length === 0) && (
              <div className={styles.formElementsPlaceholder}>No conditions added.</div>
           )}
        </div>
      </div>
    </NodeWrapper>
  );
}

export default LlmNode;