import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import { useBuilderStore } from '../../store/index-bak';
import { AnchorIcon, IframeIcon, StartNodeIcon } from '../icons/Icons';

function IframeNode({ id, data }) {
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const anchorNodeId = useBuilderStore((state) => state.anchorNodeId);
  const setAnchorNodeId = useBuilderStore((state) => state.setAnchorNodeId);
  const startNodeId = useBuilderStore((state) => state.startNodeId); // <<< [추가]
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId); // <<< [추가]
  const nodeColor = useBuilderStore((state) => state.nodeColors.iframe);
  const textColor = useBuilderStore((state) => state.nodeTextColors.iframe);

  const isAnchored = anchorNodeId === id;
  const isStartNode = startNodeId === id; // <<< [추가]

  // Calculate width dynamically, ensuring a minimum width
  const nodeWidth = Math.max(parseInt(data.width || '250', 10) + 40, 250);

  return (
    // <<< [수정] isStartNode 클래스 추가 및 스타일 수정 >>>
    <div
        className={`${styles.nodeWrapper} ${isAnchored ? styles.anchored : ''} ${isStartNode ? styles.startNode : ''}`}
        style={{width: `${nodeWidth}px`}} // Use calculated width
    >
      <Handle type="target" position={Position.Left} />

      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <div className={styles.headerLeft}>
            <IframeIcon />
            <span className={styles.headerTextContent}>iFrame</span>
        </div>
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
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
              className={styles.deleteButton}
              style={{ color: textColor }}
            >
              X
            </button>
        </div>
      </div>

      <div className={styles.nodeBody}>
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
                     // Use data.url directly; error handling might be complex here
                     src={data.url}
                     width={data.width || '100%'}
                     height={data.height || '200'}
                     style={{ border: '1px solid #ccc', borderRadius: '4px' }}
                     title="iframe-preview"
                     // sandbox attribute can enhance security but might break functionality
                     // sandbox="allow-scripts allow-same-origin"
                     onError={(e) => console.warn("Iframe preview error:", e)} // Basic error logging
                 ></iframe>
             ) : (
                <div className={styles.formElementsPlaceholder}>No URL provided.</div>
             )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default IframeNode;