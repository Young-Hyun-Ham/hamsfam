import { useState, useEffect } from 'react';
import { useModal } from '@/providers/ModalProvider';

import { useBuilderStore } from '../../store/index';
import styles from '../NodeController.module.css';
import * as backendService from '../../services/backendService';
import ApiTemplateModal from '../modals/ApiTemplateModal';

import { useNodeController } from './hooks/useNodeController';
import ChainNextCheckbox from './common/ChainNextCheckbox';

function ApiCallEditor({ apiCall, onUpdate, onDelete, onTest }) {
  // ... (ApiCallEditor 컴포넌트 내용은 변경 없음)
  const handleUpdate = (field, value) => {
    onUpdate({ ...apiCall, [field]: value });
  };

  const handleMappingChange = (index, part, value) => {
    const newMapping = [...(apiCall.responseMapping || [])];
    newMapping[index] = { ...newMapping[index], [part]: value };
    handleUpdate('responseMapping', newMapping);
  };

  const addMapping = () => {
    const newMapping = [...(apiCall.responseMapping || []), { path: '', slot: '' }];
    handleUpdate('responseMapping', newMapping);
  };

  const deleteMapping = (index) => {
    const newMapping = (apiCall.responseMapping || []).filter((_, i) => i !== index);
    handleUpdate('responseMapping', newMapping);
  };

  return (
    <div className={styles.elementEditor}>
      <div className={styles.formGroup}>
        <label>API Call Name</label>
        <input type="text" value={apiCall.name || ''} onChange={(e) => handleUpdate('name', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label>Method</label>
        <select value={apiCall.method || 'GET'} onChange={(e) => handleUpdate('method', e.target.value)}>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div className={styles.formGroup}>
        <label>URL</label>
        <textarea value={apiCall.url || ''} onChange={(e) => handleUpdate('url', e.target.value)} rows={3} />
      </div>
      <div className={styles.formGroup}>
        <label>Headers (JSON)</label>
        <textarea value={apiCall.headers || '{}'} onChange={(e) => handleUpdate('headers', e.target.value)} rows={4} />
      </div>
      {apiCall.method !== 'GET' && (
        <div className={styles.formGroup}>
          <label>Body (JSON)</label>
          <textarea value={apiCall.body || '{}'} onChange={(e) => handleUpdate('body', e.target.value)} rows={6} />
        </div>
      )}
      <div className={styles.separator} />
      <div className={styles.formGroup}>
        <label>Response Mapping</label>
        <div className={styles.repliesContainer}>
          {(apiCall.responseMapping || []).map((mapping, index) => (
            <div key={index} className={styles.quickReply}>
              <input className={styles.quickReplyInput} value={mapping.path} onChange={(e) => handleMappingChange(index, 'path', e.target.value)} placeholder="JSON Path (e.g., data.name)" />
              <input className={styles.quickReplyInput} value={mapping.slot} onChange={(e) => handleMappingChange(index, 'slot', e.target.value)} placeholder="Slot Name" />
              <button onClick={() => deleteMapping(index)} className={styles.deleteReplyButton}>×</button>
            </div>
          ))}
          <button onClick={addMapping} className={styles.addReplyButton}>+ Add Mapping</button>
        </div>
      </div>
      <div className={styles.editorActions}>
        <button className={styles.testApiButton} onClick={() => onTest(apiCall)}>Test</button>
        <button className={styles.deleteElementButton} onClick={() => onDelete(apiCall.id)}>Delete</button>
      </div>
    </div>
  );
}

function ApiNodeController({ localNode, setLocalNode, backend }) {
  const { showAlert, showConfirm } = useModal();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [apiTemplates, setApiTemplates] = useState([]);
  const [selectedApiCallId, setSelectedApiCallId] = useState(null);
  // 3. 훅 사용 및 로컬 함수 제거
  const { handleLocalDataChange } = useNodeController(setLocalNode);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templates = await backendService.fetchApiTemplates(backend);
        setApiTemplates(templates);
      } catch (error) {
        console.error("Failed to fetch API templates:", error);
      }
    };
    fetchTemplates();
  }, [backend]);

  const handleSaveTemplate = async (templateName) => {
    const { isMulti, apis, ...singleApiData } = localNode.data;
    let templateData;

    if (isMulti) {
      if (!selectedApiCallId) {
        await showAlert("Please select an API call from the list to save as a template.");
        return;
      }
      const selectedApi = apis.find(api => api.id === selectedApiCallId);
      templateData = { name: templateName, ...selectedApi };
      delete templateData.id;
    } else {
      templateData = {
        name: templateName,
        method: singleApiData.method,
        url: singleApiData.url,
        headers: singleApiData.headers,
        body: singleApiData.body,
        responseMapping: singleApiData.responseMapping,
      };
    }

    try {
      const savedTemplate = await backendService.saveApiTemplate(backend, templateData);
      setApiTemplates(prev => [...prev, savedTemplate]);
      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error("Failed to save API template:", error);
      await showAlert("Failed to save template.");
    }
  };

  const handleLoadTemplate = (template) => {
    const { name, ...templateData } = template;

    setLocalNode(prev => {
      const newData = { ...prev.data };
      if (newData.isMulti) {
        if (!selectedApiCallId) {
          showAlert("Please select an API call from the list to apply the template.");
          return prev;
        }
        newData.apis = newData.apis.map(api =>
          api.id === selectedApiCallId
            ? { ...api, ...templateData }
            : api
        );
      } else {
        Object.assign(newData, templateData);
      }
      return { ...prev, data: newData };
    });
    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = async (templateId) => {
    const confirmed = await showConfirm("Are you sure you want to delete this template? This action cannot be undone.");
    if (confirmed) {
      try {
        await backendService.deleteApiTemplate(backend, templateId);
        setApiTemplates(prev => prev.filter(t => t.id !== templateId));
      } catch (error) {
        console.error("Failed to delete API template:", error);
        await showAlert("Failed to delete template.");
      }
    }
  };

  const handleTestApiCall = async (apiCall) => {
    try {
      const result = await backendService.testApiCall(apiCall);
      await showAlert(`API Test Success!\n\nResponse:\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      await showAlert(`API Test Failed:\n${error.message}`);
    }
  };

  const handleApiMultiToggle = async (e) => {
    const isMulti = e.target.checked;

    if (!isMulti && (localNode.data.apis?.length || 0) > 1) {
      const confirmed = await showConfirm(
        "Disabling Multi API will keep only the first API call's configuration. All other API calls will be removed. Are you sure you want to continue?"
      );
      if (!confirmed) {
        e.target.checked = true;
        return;
      }
    }

    setLocalNode(prev => {
      const newData = { ...prev.data, isMulti };
      if (isMulti) {
        if (!newData.apis || newData.apis.length === 0) {
          newData.apis = [{
            id: `api-call-${Date.now()}`,
            name: 'API Call 1',
            method: prev.data.method,
            url: prev.data.url,
            headers: prev.data.headers,
            body: prev.data.body,
            responseMapping: prev.data.responseMapping,
          }];
        }
      } else {
        const firstApi = prev.data.apis?.[0] || {};
        newData.method = firstApi.method || 'GET';
        newData.url = firstApi.url || '';
        newData.headers = firstApi.headers || '{}';
        newData.body = firstApi.body || '{}';
        newData.responseMapping = firstApi.responseMapping || [];
        newData.apis = [];
      }
      return { ...prev, data: newData };
    });
  };

  const renderSingleApiControls = () => {
    const { data } = localNode;
    // 4. 훅의 handleLocalDataChange를 사용하도록 수정
    const handleMappingChange = (index, part, value) => {
      const newMapping = [...(data.responseMapping || [])];
      newMapping[index] = { ...newMapping[index], [part]: value };
      handleLocalDataChange('responseMapping', newMapping); // 훅 함수 사용
    };
    const addMapping = () => {
      const newMapping = [...(data.responseMapping || []), { path: '', slot: '' }];
      handleLocalDataChange('responseMapping', newMapping); // 훅 함수 사용
    };
    const deleteMapping = (index) => {
      const newMapping = (data.responseMapping || []).filter((_, i) => i !== index);
      handleLocalDataChange('responseMapping', newMapping); // 훅 함수 사용
    };

    return (
      <>
        <div className={styles.formGroup}>
          <label>Method</label>
          <select value={data.method || 'GET'} onChange={(e) => handleLocalDataChange('method', e.target.value)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>URL</label>
          <textarea value={data.url || ''} onChange={(e) => handleLocalDataChange('url', e.target.value)} rows={3} />
        </div>
        <div className={styles.formGroup}>
          <label>Headers (JSON)</label>
          <textarea value={data.headers || '{}'} onChange={(e) => handleLocalDataChange('headers', e.target.value)} rows={4} />
        </div>
        {data.method !== 'GET' && (
          <div className={styles.formGroup}>
            <label>Body (JSON)</label>
            <textarea value={data.body || '{}'} onChange={(e) => handleLocalDataChange('body', e.target.value)} rows={6} />
          </div>
        )}
        <div className={styles.separator} />
        <div className={styles.formGroup}>
          <label>Response Mapping</label>
          <div className={styles.repliesContainer}>
            {(data.responseMapping || []).map((mapping, index) => (
              <div key={index} className={styles.quickReply}>
                <input className={styles.quickReplyInput} value={mapping.path} onChange={(e) => handleMappingChange(index, 'path', e.target.value)} placeholder="JSON Path (e.g., data.name)" />
                <input className={styles.quickReplyInput} value={mapping.slot} onChange={(e) => handleMappingChange(index, 'slot', e.target.value)} placeholder="Slot Name" />
                <button onClick={() => deleteMapping(index)} className={styles.deleteReplyButton}>×</button>
              </div>
            ))}
            <button onClick={addMapping} className={styles.addReplyButton}>+ Add Mapping</button>
          </div>
        </div>
      </>
    )
  };

  const renderMultiApiControls = () => {
    const apis = localNode.data.apis || [];
    const selectedApiCall = apis.find(api => api.id === selectedApiCallId);

    const handleAddApiCall = () => {
      const newApiCall = {
        id: `api-call-${Date.now()}`,
        name: `API Call ${apis.length + 1}`,
        method: 'GET',
        url: '',
        headers: '{}',
        body: '{}',
        responseMapping: [],
      };
      handleLocalDataChange('apis', [...apis, newApiCall]); // 훅 함수 사용
    };
    const handleUpdateApiCall = (updatedApiCall) => {
      const newApis = apis.map(api => api.id === updatedApiCall.id ? updatedApiCall : api);
      handleLocalDataChange('apis', newApis); // 훅 함수 사용
    };
    const handleDeleteApiCall = (apiIdToDelete) => {
      const newApis = apis.filter(api => api.id !== apiIdToDelete);
      handleLocalDataChange('apis', newApis); // 훅 함수 사용
      if (selectedApiCallId === apiIdToDelete) {
        setSelectedApiCallId(null);
      }
    };

    return (
      <>
        <div className={styles.formGroup}>
          <label>API Calls</label>
          <div className={styles.elementsContainer}>
            {apis.map((api) => (
              <div
                key={api.id}
                className={`${styles.elementItem} ${api.id === selectedApiCallId ? styles.selected : ''}`}
                onClick={() => setSelectedApiCallId(api.id)}
              >
                <span>{api.name || 'API Call'}</span>
              </div>
            ))}
            <button onClick={handleAddApiCall} className={styles.addReplyButton}>+ Add API Call</button>
          </div>
        </div>
        <div className={styles.separator} />
        {selectedApiCall && (
          <ApiCallEditor
            apiCall={selectedApiCall}
            onUpdate={handleUpdateApiCall}
            onDelete={handleDeleteApiCall}
            onTest={handleTestApiCall}
          />
        )}
      </>
    )
  };

  return (
    <>
      <ApiTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSave={handleSaveTemplate}
        onSelect={handleLoadTemplate}
        onDelete={handleDeleteTemplate}
        templates={apiTemplates}
        isMulti={localNode.data.isMulti}
        selectedApiCallName={localNode.data.isMulti ? localNode.data.apis?.find(api => api.id === selectedApiCallId)?.name : null}
      />
      <div className={styles.apiMultiToggle}>
        <label htmlFor="multiApiToggle">Enable Multi API</label>
        <input
          type="checkbox"
          id="multiApiToggle"
          checked={localNode.data.isMulti || false}
          onChange={handleApiMultiToggle}
        />
      </div>
      {/* 5. 기존 UI를 공통 컴포넌트로 대체 */}
      <ChainNextCheckbox
        checked={localNode.data.chainNext}
        onChange={(value) => handleLocalDataChange('chainNext', value)}
      />
      <div className={styles.templateActions}>
        <button onClick={() => setIsTemplateModalOpen(true)}>Templates</button>
      </div>
      <div className={styles.separator} />
      {localNode.data.isMulti ? renderMultiApiControls() : renderSingleApiControls()}
    </>
  )
}

export default ApiNodeController;