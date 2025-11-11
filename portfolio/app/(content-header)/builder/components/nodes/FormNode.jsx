// (Handle, Position 임포트 제거)
import styles from './ChatNodes.module.css';
import useBuilderStore from '../../store/index';
// (AnchorIcon, StartNodeIcon 임포트 제거)
import { formatDisplayKeys } from '../../utils/gridUtils';
import NodeWrapper from './NodeWrapper'; // 1. Wrapper 임포트

function FormNode({ id, data }) {
  // 2. 공통 로직 제거
  const nodeColor = useBuilderStore((state) => state.nodeColors.form);
  const textColor = useBuilderStore((state) => state.nodeTextColors.form);

  // (isAnchored, isStartNode 로직 제거)

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
            {/* --- 💡 수정된 부분 시작 (formatDisplayKeys 헬퍼 사용) --- */}
            {element.optionsSlot && element.displayKeys && element.displayKeys.length > 0 && (
                <div className={styles.slotBindingInfo} style={{ fontStyle: 'normal', color: '#555', fontSize: '0.7rem' }}>
                    Displaying: {formatDisplayKeys(element.displayKeys)}
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
    // 3. NodeWrapper로 감싸기
    <NodeWrapper
      id={id}
      typeLabel="Form"
      icon={null} // (FormNode는 아이콘이 없었음)
      nodeColor={nodeColor}
      textColor={textColor}
      customClassName={styles.formNodeWrapper} // 4. 너비 조절을 위한 커스텀 클래스 전달
    >
      {/* 5. 기존 nodeBody의 내용만 children으로 전달 */}
      <div className={styles.section}>
        {/* Form Title is now readOnly, edited in Controller */}
        <input
          className={`${styles.textInput} ${styles.formTitleInput}`}
          value={data.title}
          readOnly // Controller에서 수정하므로 readOnly로 변경
          placeholder="Form Title"
        />
        {/* <<< [수정] 엑셀 업로드 표시기 >>> */}
        {data.enableExcelUpload && (
          <div className={styles.formFeatureIndicator}>
            (Excel Upload Enabled)
          </div>
        )}
        {/* <<< [수정 끝] >>> */}
      </div>
      <div className={styles.formPreview}>
        {data.elements && data.elements.length > 0
          ? data.elements.map(renderElementPreview)
          : <div className={styles.formElementsPlaceholder}>No elements added yet.</div>
        }
      </div>
    </NodeWrapper>
  );
}

export default FormNode;