import { useState } from 'react';
import styles from './ApiTemplateModal.module.css'; // API 템플릿 모달과 동일한 스타일 사용

function FormTemplateModal({ isOpen, onClose, onSave, onSelect, onDelete, templates }) {
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
    e.stopPropagation();
    onDelete(templateId);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2>Form Templates</h2>
        
        <div className={styles.saveSection}>
          <h3>Save Current Form as Template</h3>
          <p className={styles.instructionText}>Save the current form's title and elements as a new template.</p>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                setError('');
              }}
              placeholder="Enter new template name"
            />
            <button onClick={handleSave}>Save</button>
          </div>
          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>

        <div className={styles.loadSection}>
          <h3>Load from Template</h3>
          <p className={styles.instructionText}>This will replace the current form's title and elements.</p>
          <div className={styles.templateList}>
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className={styles.templateItem}>
                  <span>{template.name}</span>
                  <div className={styles.buttonGroup}>
                    <button onClick={() => handleSelect(template)} className={styles.loadButton}>Load</button>
                    <button onClick={(e) => handleDelete(e, template.id)} className={styles.deleteButton}>Delete</button>
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

export default FormTemplateModal;