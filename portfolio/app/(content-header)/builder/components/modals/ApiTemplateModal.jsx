import { useState } from 'react';
import styles from './ApiTemplateModal.module.css';

function ApiTemplateModal({ isOpen, onClose, onSave, onSelect, onDelete, templates, isMulti, selectedApiCallName }) {
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (!templateName.trim()) {
      setError('Please enter a template name.');
      return;
    }
    if (templates.some(t => t.name === templateName.trim())) {
      setError('A template with this name already exists.');
      return;
    }
    onSave(templateName.trim());
    setTemplateName('');
    setError('');
  };

  const handleSelect = (template) => {
    onSelect(template);
    onClose();
  };
  
  const handleDelete = (e, templateId) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    onDelete(templateId);
  };

  const saveInstruction = isMulti 
    ? (selectedApiCallName ? `Save '${selectedApiCallName}' as a new template.` : 'Select an API call from the list to save it.')
    : 'Save the current API configuration as a new template.';

  const loadInstruction = isMulti
    ? (selectedApiCallName ? `Load a template into '${selectedApiCallName}'.` : 'Select an API call from the list to load a template into it.')
    : 'Load a template into the current API configuration.';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2>API Templates</h2>
        
        <div className={styles.saveSection}>
          <h3>Save as Template</h3>
          <p className={styles.instructionText}>{saveInstruction}</p>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                setError('');
              }}
              placeholder="Enter new template name"
              disabled={isMulti && !selectedApiCallName}
            />
            <button onClick={handleSave} disabled={isMulti && !selectedApiCallName}>Save</button>
          </div>
          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>

        <div className={styles.loadSection}>
          <h3>Load from Template</h3>
          <p className={styles.instructionText}>{loadInstruction}</p>
          <div className={styles.templateList}>
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className={styles.templateItem}>
                  <span>{template.name}</span>
                  <div className={styles.buttonGroup}>
                    <button onClick={() => handleSelect(template)} className={styles.loadButton}>Load</button>
                    {/* --- 💡 수정된 부분 시작 --- */}
                    <button onClick={(e) => handleDelete(e, template.id)} className={styles.deleteButton}>Delete</button>
                    {/* --- 💡 수정된 부분 끝 --- */}
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.placeholder}>No saved templates.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiTemplateModal;