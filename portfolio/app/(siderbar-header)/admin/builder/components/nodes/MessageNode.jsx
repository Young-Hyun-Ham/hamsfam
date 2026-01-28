
import styles from './ChatNodes.module.css';
import { Handle, Position } from 'reactflow';
import useBuilderStore from '../../store/index';

import NodeWrapper from './NodeWrapper'; // 1. Wrapper 임포트

// (AnchorIcon, StartNodeIcon 임포트 제거)
// (Handle, Position 임포트 제거 - Wrapper가 처리)

function MessageNode({ id, data }) {
  // 2. 공통 로직(delete, anchor, start) 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.message);
  const textColor = useBuilderStore((state) => state.nodeTextColors.message);
  
  const customHandles = (
    <>
      {data.replies.length > 0 ? (
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
      ) : <Handle type="source" position={Position.Right} />}
    </>
  );

  return (
    // 3. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="Message"
      icon={null} // (MessageNode는 별도 아이콘이 없었음)
      nodeColor={nodeColor}
      textColor={textColor}
      handles={customHandles}
    >
      {/* 4. 기존 nodeBody의 내용만 children으로 전달 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Content</span>
        <textarea
          className={styles.textInput}
          value={data.content}
          readOnly
          rows={3}
        />
      </div>
      {/* Quick Replie 기능 제거
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Quick Replies:</span>
        {data.replies?.map((reply, index) => (
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
      */}
    </NodeWrapper>
  );
}
export default MessageNode;