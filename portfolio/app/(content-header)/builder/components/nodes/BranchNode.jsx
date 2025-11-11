import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
// (AnchorIcon, StartNodeIcon 임포트 제거)
import NodeWrapper from './NodeWrapper'; // 1. Wrapper 임포트

function BranchNode({ id, data }) {
  // 2. 공통 로직 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.branch);
  const textColor = useBuilderStore((state) => state.nodeTextColors.branch);

  const isConditionType = data.evaluationType === 'CONDITION';
  // (isAnchored, isStartNode 로직 제거)

  // 3. Wrapper에 전달할 커스텀 핸들 정의
  const customHandles = (
    <>
      {isConditionType ? (
        // Condition 타입 핸들
        <>
          {data.conditions?.map((cond, index) => (
            <Handle
              key={cond.id || index}
              type="source"
              position={Position.Right}
              id={data.replies?.[index]?.value}
              style={{ 
                top: `${(index + 1) / ((data.conditions?.length || 0) + 2) * 100}%`, 
                background: '#555' 
              }}
            />
          ))}
          <Handle
             type="source"
             position={Position.Right}
             id="default"
             style={{ 
               top: `${((data.conditions?.length || 0) + 1) / ((data.conditions?.length || 0) + 2) * 100}%`, 
               background: '#e74c3c' 
              }}
           />
           <div style={{ position: 'absolute', bottom: 10, right: -45, fontSize: '11px', color: '#e74c3c' }}>
             Default
           </div>
        </>
      ) : (
        // Button 타입 핸들
        <>
          {data.replies?.map((reply, index) => (
             <Handle
               key={reply.value}
               type="source"
               position={Position.Right}
               id={reply.value}
               style={{ 
                 top: `${(index + 1) / (data.replies.length + 1) * 100}%`, 
                 background: '#555' 
                }}
             />
           ))}
        </>
      )}
    </>
  );

  return (
    // 4. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="Condition Branch"
      icon={null} // (아이콘 없음)
      nodeColor={nodeColor}
      textColor={textColor}
      handles={customHandles} // 5. 커스텀 핸들 전달
    >
      {/* 6. 기존 nodeBody의 내용만 children으로 전달 */}
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
                  {/* 핸들은 customHandles에서 이미 정의됨 */}
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
                  {/* 핸들은 customHandles에서 이미 정의됨 */}
                </div>
              ))
            ) : (
               <div className={styles.formElementsPlaceholder}>No buttons added.</div>
            )
          )}
        </div>
      </div>
    </NodeWrapper>
  );
}

export default BranchNode;