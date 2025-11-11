import { Handle, Position } from 'reactflow';

import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
import { AnchorIcon, StartNodeIcon } from '../icons/Icons';

/**
 * 모든 노드에서 공통으로 사용되는 래퍼 컴포넌트입니다.
 * 헤더, 버튼(시작, 앵커, 삭제), 공통 스타일, 기본 핸들을 관리합니다.
 *
 * @param {object} props
 * @param {string} props.id - 노드 ID
 * @param {string} props.typeLabel - 헤더에 표시될 노드 타입 (예: "Message")
 * @param {React.ReactNode} props.icon - 헤더에 표시될 아이콘
 * @param {string} props.nodeColor - 노드 헤더 배경색
 * @param {string} props.textColor - 노드 헤더 텍스트/아이콘 색상
 * @param {React.ReactNode} props.children - 노드의 본문(body) 컨텐츠
 * @param {React.ReactNode} [props.handles=null] - (선택) 커스텀 핸들 (제공 시 기본 출력 핸들 대체)
 * @param {React.ReactNode} [props.headerButtons=null] - (선택) 헤더에 추가할 커스텀 버튼 (예: ApiNode의 테스트 버튼)
 * @param {string} [props.customClassName=""] - (선택) 래퍼 div에 추가할 클래스 (예: FormNode의 너비 조절용)
 * @param {object} [props.style={}] - (선택) 래퍼 div에 적용할 인라인 스타일 (예: IframeNode의 동적 너비)
 */
function NodeWrapper({
  id,
  typeLabel,
  icon,
  nodeColor,
  textColor,
  children,
  handles = null,
  headerButtons = null,
  customClassName = "",
  style = {}
}) {
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const anchorNodeId = useBuilderStore((state) => state.anchorNodeId);
  const setAnchorNodeId = useBuilderStore((state) => state.setAnchorNodeId);
  const startNodeId = useBuilderStore((state) => state.startNodeId);
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId);

  const isAnchored = anchorNodeId === id;
  const isStartNode = startNodeId === id;

  return (
    <div
      className={`${styles.nodeWrapper} ${isAnchored ? styles.anchored : ''} ${isStartNode ? styles.startNode : ''} ${customClassName}`}
      style={style}
    >
      {/* 1. 공통 입력 핸들 */}
      <Handle type="target" position={Position.Left} />

      {/* 2. 공통 헤더 */}
      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <div className={styles.headerLeft}>
          {icon}
          <span className={styles.headerTextContent}>{typeLabel}</span>
        </div>
        <div className={styles.headerButtons}>
          <button
            onClick={(e) => { e.stopPropagation(); setStartNodeId(id); }}
            className={`${styles.startNodeButton} ${isStartNode ? styles.active : ''}`}
            title="Set as Start Node"
          >
            <StartNodeIcon />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setAnchorNodeId(id); }}
            className={`${styles.anchorButton} ${isAnchored ? styles.active : ''}`}
            title="Set as anchor"
          >
            <AnchorIcon />
          </button>
          {/* 2a. (선택) 추가 헤더 버튼 */}
          {headerButtons}
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className={styles.deleteButton}
            style={{ color: textColor }}
          >
            X
          </button>
        </div>
      </div>

      {/* 3. 노드별 본문 컨텐츠 */}
      <div className={styles.nodeBody}>
        {children}
      </div>

      {/* 4. (선택) 커스텀 핸들 또는 기본 출력 핸들 */}
      {handles ? handles : <Handle type="source" position={Position.Right} />}
    </div>
  );
}

export default NodeWrapper;