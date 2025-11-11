import { Handle, Position } from 'reactflow';
import { useModal } from '@/providers/ModalProvider';
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
// (AnchorIcon, StartNodeIcon 임포트 제거)
import { PlayIcon } from '../icons/Icons';
import * as backendService from '../../services/backendService';
import NodeWrapper from './NodeWrapper'; // 2. Wrapper 임포트

function ApiNode({ id, data }) {
  // 3. 공통 로직 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.api);
  const textColor = useBuilderStore((state) => state.nodeTextColors.api);
  const { showAlert } = useModal();
  const apiCount = data.apis?.length || 0;
  const isMulti = data.isMulti;

  // (isAnchored, isStartNode 로직 제거)

  const handleApiTest = async (e) => {
    e.stopPropagation();
    if (isMulti) return; // Multi 모드일 때는 컨트롤러에서 개별 테스트
    try {
      const result = await backendService.testApiCall(data);
      await showAlert(`API Test Success!\n\nResponse:\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error("API Test Error:", error);
      await showAlert(`API Test Failed:\n${error.message}`);
    }
  };

  // 4. Wrapper에 전달할 추가 헤더 버튼 정의
  const extraHeaderButtons = !isMulti ? (
    <button onClick={handleApiTest} className={styles.playButton} title="Test API" style={{ color: textColor }}>
      <PlayIcon />
    </button>
  ) : null;

  // 5. Wrapper에 전달할 커스텀 핸들 정의
  const customHandles = (
    <>
      <Handle type="source" position={Position.Right} id="onSuccess" style={{ top: '35%', background: '#2ecc71' }} />
      <span style={{ position: 'absolute', right: '-70px', top: '35%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#2ecc71' }}>On Success</span>
      <Handle type="source" position={Position.Right} id="onError" style={{ top: '65%', background: '#e74c3c' }} />
      <span style={{ position: 'absolute', right: '-60px', top: '65%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#e74c3c' }}>On Error</span>
    </>
  );

  return (
    // 6. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel={isMulti ? `API (${apiCount} calls)` : 'API'}
      icon={null} // (ApiNode는 아이콘이 없었음)
      nodeColor={nodeColor}
      textColor={textColor}
      headerButtons={extraHeaderButtons} // 추가 버튼 전달
      handles={customHandles} // 커스텀 핸들 전달
    >
      {/* 7. 기존 nodeBody의 내용만 children으로 전달 */}
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
    </NodeWrapper>
  );
}
export default ApiNode;