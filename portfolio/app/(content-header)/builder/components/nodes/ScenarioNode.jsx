import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
import { CollapseNodeIcon, ExpandNodeIcon, StartNodeIcon } from '../icons/Icons';

function ScenarioNode({ id, data }) {
  const startNodeId = useBuilderStore((state) => state.startNodeId); // <<< [추가]
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId); // <<< [추가]
  const nodeColor = useBuilderStore((state) => state.nodeColors.scenario) || '#7f8c8d';
  const textColor = useBuilderStore((state) => state.nodeTextColors.scenario) || '#ffffff';
  const toggleScenarioNode = useBuilderStore((state) => state.toggleScenarioNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);

  const isCollapsed = data.isCollapsed || false;
  const isStartNode = startNodeId === id; // <<< [추가]

  return (
    // <<< [수정] isStartNode 클래스 추가 >>>
    <div
      className={`${styles.nodeWrapper} ${styles.scenarioNodeWrapper} ${isStartNode ? styles.startNode : ''}`}
      style={isCollapsed ? { height: '50px', width: '250px' } : {}}
    >
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <span className={styles.headerTextContent}>Scenario: {data.label}</span>
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
            {/* Anchor button removed for scenario node */}
            <button onClick={() => toggleScenarioNode(id)} className={styles.anchorButton} title={isCollapsed ? "Expand" : "Collapse"}>
              {isCollapsed ? <ExpandNodeIcon /> : <CollapseNodeIcon />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteNode(id); }} className={styles.deleteButton} style={{color: textColor, fontSize: '1rem', marginRight: '-5px'}}>
                &times;
            </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className={styles.nodeBody}>
          <p className={styles.scenarioDescription}>
            This group contains the '{data.label}' scenario. Double-click header to collapse/expand.
          </p>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default ScenarioNode;