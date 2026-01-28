// (Handle, Position 임포트 제거)
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
// (AnchorIcon, StartNodeIcon 임포트 제거)
import { IframeIcon } from '../icons/Icons';
import NodeWrapper from './NodeWrapper';

function IframeNode({ id, data }) {
  // 3. 공통 로직 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.iframe);
  const textColor = useBuilderStore((state) => state.nodeTextColors.iframe);

  // (isAnchored, isStartNode 로직 제거)

  // 4. 동적 너비 계산
  const nodeWidth = Math.max(parseInt(data.width || '250', 10) + 40, 250);

  return (
    // 5. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="iFrame"
      icon={<IframeIcon />} // 6. 아이콘 전달
      nodeColor={nodeColor}
      textColor={textColor}
      style={{ width: `${nodeWidth}px` }} // 7. 동적 스타일 전달
    >
      {/* 8. 기존 nodeBody의 내용만 children으로 전달 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>URL</span>
        <textarea
          className={styles.textInput}
          value={data.url || ''}
          readOnly
          rows={2}
        />
      </div>
      <div className={styles.section}>
           {/* Preview iframe - handle potential errors or invalid URLs */}
           {data.url ? (
               <iframe
                   src={data.url}
                   width={data.width || '100%'}
                   height={data.height || '200'}
                   style={{ border: '1px solid #ccc', borderRadius: '4px' }}
                   title="iframe-preview"
                   onError={(e) => console.warn("Iframe preview error:", e)}
               ></iframe>
           ) : (
              <div className={styles.formElementsPlaceholder}>No URL provided.</div>
           )}
      </div>
    </NodeWrapper>
  );
}

export default IframeNode;