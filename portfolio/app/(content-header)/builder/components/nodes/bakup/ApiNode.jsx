import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import { useBuilderStore } from '../../store/index-bak';
import { AnchorIcon, PlayIcon, StartNodeIcon } from '../icons/Icons';
// import * as backendService from '../backendService'; // 💡[추가된 부분]

function ApiNode({ id, data }) {
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const anchorNodeId = useBuilderStore((state) => state.anchorNodeId);
  const setAnchorNodeId = useBuilderStore((state) => state.setAnchorNodeId);
  const startNodeId = useBuilderStore((state) => state.startNodeId); // <<< [추가]
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId); // <<< [추가]
  const nodeColor = useBuilderStore((state) => state.nodeColors.api);
  const textColor = useBuilderStore((state) => state.nodeTextColors.api);
  // const { showAlert } = useAlert();
  const apiCount = data.apis?.length || 0;
  const isMulti = data.isMulti;

  const isAnchored = anchorNodeId === id;
  const isStartNode = startNodeId === id; // <<< [추가]

  const handleApiTest = async (e) => {
    e.stopPropagation();
    if (isMulti) return; // Multi 모드일 때는 컨트롤러에서 개별 테스트
    try {
      // 💡[수정된 부분] backendService의 testApiCall 함수 사용
      // const result = await backendService.testApiCall(data);
      // await showAlert(`API Test Success!\n\nResponse:\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error("API Test Error:", error);
      // await showAlert(`API Test Failed:\n${error.message}`);
    }
  };

  return (
    // <<< [수정] isStartNode 클래스 추가 >>>
    <div className={`${styles.nodeWrapper} ${isAnchored ? styles.anchored : ''} ${isStartNode ? styles.startNode : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <span className={styles.headerTextContent}>
          {isMulti ? `API (${apiCount} calls)` : 'API'}
        </span>
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
            {!isMulti && (
              <button onClick={handleApiTest} className={styles.playButton} title="Test API" style={{ color: textColor }}>
                  <PlayIcon />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); deleteNode(id); }} className={styles.deleteButton} style={{ backgroundColor: nodeColor, color: textColor }}>X</button>
        </div>
      </div>
      <div className={styles.nodeBody}>
        {isMulti ? (
          <div className={styles.section}>
            {data.apis?.map(api => (
                <div key={api.id} className={styles.previewBox}>
                    {api.name || 'API Call'}
                </div>
            ))}
             {(!data.apis || data.apis.length === 0) && (
                <div className={styles.formElementsPlaceholder}>No API calls configured.</div>
             )}
          </div>
        ) : (
          <>
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Method</span>
              <input className={styles.textInput} value={data.method || 'GET'} readOnly />
            </div>
            <div className={styles.section}>
              <span className={styles.sectionTitle}>URL</span>
              <textarea className={styles.textInput} value={data.url} readOnly rows={2} />
            </div>
          </>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="onSuccess" style={{ top: '35%', background: '#2ecc71' }} />
      <span style={{ position: 'absolute', right: '-70px', top: '35%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#2ecc71' }}>On Success</span>
      <Handle type="source" position={Position.Right} id="onError" style={{ top: '65%', background: '#e74c3c' }} />
      <span style={{ position: 'absolute', right: '-60px', top: '65%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#e74c3c' }}>On Error</span>
    </div>
  );
}
export default ApiNode;