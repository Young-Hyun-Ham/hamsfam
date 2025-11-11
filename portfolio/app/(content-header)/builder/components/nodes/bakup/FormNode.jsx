import { Handle, Position } from 'reactflow';
import styles from './ChatNodes.module.css';
import { useBuilderStore } from '../../store/index-bak';
import { AnchorIcon, StartNodeIcon } from '../icons/Icons';

function FormNode({ id, data }) {
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const anchorNodeId = useBuilderStore((state) => state.anchorNodeId);
  const setAnchorNodeId = useBuilderStore((state) => state.setAnchorNodeId);
  const startNodeId = useBuilderStore((state) => state.startNodeId); // <<< [추가]
  const setStartNodeId = useBuilderStore((state) => state.setStartNodeId); // <<< [추가]
  const updateNodeData = useBuilderStore((state) => state.updateNodeData); // updateNodeData는 이미 있음
  const nodeColor = useBuilderStore((state) => state.nodeColors.form);
  const textColor = useBuilderStore((state) => state.nodeTextColors.form);

  const isAnchored = anchorNodeId === id;
  const isStartNode = startNodeId === id; // <<< [추가]

  const renderElementPreview = (element) => {
    // ... (기존 renderElementPreview 함수 내용은 동일)
     switch (element.type) {
      case 'input':
        return (
          <div key={element.id} className={styles.previewElement}>
            <label className={styles.previewLabel}>{element.label || 'Input'}</label>
            <input
              type="text"
              className={styles.previewInput}
              placeholder={element.placeholder || ''}
              readOnly
            />
          </div>
        );
      case 'date':
        return (
           <div key={element.id} className={styles.previewElement}>
            <label className={styles.previewLabel}>{element.label || 'Date'}</label>
            <input type="text" className={styles.previewInput} placeholder="YYYY-MM-DD" readOnly />
          </div>
        );
      case 'grid':
        return (
          <div key={element.id} className={styles.previewElement}>
            <label className={styles.previewLabel}>{element.label || 'Grid'}</label>
            {element.optionsSlot && (
              <div className={styles.slotBindingInfo}>Bound to: {`{${element.optionsSlot}}`}</div>
            )}
            {/* --- 💡 수정된 부분 시작 --- */}
            {element.optionsSlot && element.displayKeys && element.displayKeys.length > 0 && (
                <div className={styles.slotBindingInfo} style={{ fontStyle: 'normal', color: '#555', fontSize: '0.7rem' }}>
                    Displaying: {element.displayKeys.join(', ')}
                </div>
            )}
            {/* --- 💡 수정된 부분 끝 --- */}
            <table className={styles.previewGridTable}>
              <tbody>
                {[...Array(element.rows || 2)].map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {[...Array(element.columns || 2)].map((_, colIndex) => {
                      const cellIndex = rowIndex * (element.columns || 2) + colIndex;
                      // Ensure data exists and access element safely
                      const cellValue = element.data && element.data[cellIndex] !== undefined ? element.data[cellIndex] : '';
                      return (
                        <td key={colIndex}>
                          {cellValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'checkbox':
        return (
          <div key={element.id} className={styles.previewElement}>
            <label className={styles.previewLabel}>{element.label || 'Checkbox'}</label>
            <div className={styles.previewOptionsContainer}>
              {(element.options && element.options.length > 0 ? element.options : ['Option 1', 'Option 2']).map((opt, i) => (
                <div key={i} className={styles.previewCheckbox}>
                  <input type="checkbox" id={`${element.id}-${i}`} checked={false} readOnly />
                  <label htmlFor={`${element.id}-${i}`}>{opt}</label>
                </div>
              ))}
            </div>
          </div>
        );
      case 'dropbox':
         // optionsSlot이 있고, fallback 옵션이 없으면 기본 옵션 표시
         const displayOptions = element.optionsSlot && (!element.options || element.options.length === 0)
             ? ['Option 1', 'Option 2']
             : (element.options || ['Option 1', 'Option 2']);

        return (
          <div key={element.id} className={styles.previewElement}>
            <label className={styles.previewLabel}>{element.label || 'Dropbox'}</label>
            {element.optionsSlot && (
              <div className={styles.slotBindingInfo}>Bound to: {`{${element.optionsSlot}}`}</div>
            )}
            <select className={styles.previewInput} disabled>
               {displayOptions.map((opt, i) => {
                   const value = typeof opt === 'object' ? opt.value : opt;
                   const label = typeof opt === 'object' ? opt.label : opt;
                   return <option key={value || i} value={value}>{label}</option>;
               })}
            </select>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    // <<< [수정] isStartNode 클래스 추가 >>>
    <div className={`${styles.nodeWrapper} ${styles.formNodeWrapper} ${isAnchored ? styles.anchored : ''} ${isStartNode ? styles.startNode : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeHeader} style={{ backgroundColor: nodeColor, color: textColor }}>
        <span className={styles.headerTextContent}>Form</span>
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
            <button onClick={(e) => { e.stopPropagation(); deleteNode(id); }} className={styles.deleteButton} style={{ backgroundColor: nodeColor, color: textColor }}>X</button>
        </div>
      </div>
      <div className={styles.nodeBody}>
        <div className={styles.section}>
          {/* Form Title is now readOnly, edited in Controller */}
          <input
            className={`${styles.textInput} ${styles.formTitleInput}`}
            value={data.title}
            readOnly // Controller에서 수정하므로 readOnly로 변경
            placeholder="Form Title"
          />
        </div>
        <div className={styles.formPreview}>
          {data.elements && data.elements.length > 0
            ? data.elements.map(renderElementPreview)
            : <div className={styles.formElementsPlaceholder}>No elements added yet.</div>
          }
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default FormNode;