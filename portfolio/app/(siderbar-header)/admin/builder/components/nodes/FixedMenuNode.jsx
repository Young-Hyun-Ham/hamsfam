// app/(siderbar-header)/admin/builder/components/nodes/FixedMenuNode.jsx

import { useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';

import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
// (AnchorIcon, StartNodeIcon 임포트 제거)
import NodeWrapper from './NodeWrapper'; // 1. Wrapper 임포트

function FixedMenuNode({ id, data }) {
  // 2. 공통 로직 제거
  const branchOptionRefs = useRef([]);
  const nodeColor = useBuilderStore((state) => state.nodeColors.fixedmenu);
  const textColor = useBuilderStore((state) => state.nodeTextColors.fixedmenu);

  // (isAnchored, isStartNode 로직 제거)

  useEffect(() => {
    branchOptionRefs.current = branchOptionRefs.current.slice(0, data.replies?.length);
  }, [data.replies]);

  // 3. Wrapper에 전달할 커스텀 핸들 정의
  const customHandles = (
    <>
      {data.replies?.map((reply, index) => (
        <Handle
          key={reply.value}
          type="source"
          position={Position.Right}
          id={reply.value}
          style={{ 
            // 핸들 위치를 동적으로 계산 (NodeWrapper 내부의 ref를 사용하기 어려우므로 수동 계산)
            // 이 계산은 완벽하지 않을 수 있으며, 필요시 고정 위치로 변경
            top: `${70 + (index * 40)}px`, // 이 값은 노드 본문의 실제 레이아웃에 따라 조정 필요
            background: '#555' 
          }}
        />
      ))}
    </>
  );

  return (
    // 4. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="Fixed Menu"
      icon={null} // (아이콘 없음)
      nodeColor={nodeColor}
      textColor={textColor}
      handles={customHandles} // 5. 커스텀 핸들 전달
    >
      {/* 6. 기존 nodeBody의 내용만 children으로 전달 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Menu Title</span>
        <textarea
          className={styles.textInput}
          value={data.content || ''}
          readOnly
          rows={2}
        />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Menus:</span>
        <div className={styles.branchOptionsContainer}>
          {data.replies?.map((reply, index) => (
            <div key={reply.value} className={styles.branchOption} ref={el => branchOptionRefs.current[index] = el}>
              <span className={styles.branchOptionButton}>{reply.display}</span>
              {/* 핸들은 customHandles에서 이미 정의됨 */}
            </div>
          ))}
           {(data.replies?.length === 0) && (
              <div className={styles.formElementsPlaceholder}>No menus added.</div>
           )}
        </div>
      </div>
    </NodeWrapper>
  );
}

export default FixedMenuNode;