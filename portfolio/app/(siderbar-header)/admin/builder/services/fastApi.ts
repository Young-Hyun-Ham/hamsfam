const API_BASE_URL = '/api/proxy/chat/scenarios';
const TENANT_ID = '1000';
const STAGE_ID = 'DEV';

const handleApiResponse = async (response: any) => {
    // ... (기존 에러 핸들링 로직) ...
    if (!response.ok) {
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail ? JSON.stringify(errorData.detail) : errorDetail;
        } catch (e) {
            // JSON 파싱 실패 시, 상태 코드로 오류 메시지 설정
        }
        throw new Error(errorDetail);
    }
    if (response.status === 204) {
        return;
    }
    return response.json();
};

export const fetchScenarios = async () => {
    const response = await fetch(`${API_BASE_URL}/${TENANT_ID}/${STAGE_ID}`);
    const data = await handleApiResponse(response);
    const scenarios = data?.scenarios || (Array.isArray(data) ? data : []);
    // <<< [수정] description 필드 추가 (기본값 빈 문자열) ---
    return scenarios.map((scenario: any) => ({
       ...scenario,
       job: scenario.job || 'Process',
       description: scenario.description || '', // description 추가
    }));
    // --- [수정 끝] >>>
};

// <<< [수정] description 파라미터 추가 ---
export const createScenario = async ({ newScenarioName, job, description }: any) => {
// --- [수정 끝] >>>
    const response = await fetch(`${API_BASE_URL}/${TENANT_ID}/${STAGE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // <<< [수정] description 필드 추가 ---
        body: JSON.stringify({
            category_id: 'DEV_1000_S_1_1_1',
            name: newScenarioName,
            job: job,
            description: description, // description 추가
            nodes: [],
            edges: [],
            start_node_id: null
        }),
        // --- [수정 끝] >>>
    });
    const data = await handleApiResponse(response);
    // <<< [수정] 응답에 description 추가 ---
    return { ...data, startNodeId: data.start_node_id, description: data.description || '' };
    // --- [수정 끝] >>>
};

export const cloneScenario = async ({ scenarioToClone, newName }: any) => {
  const response = await fetch(`${API_BASE_URL}/${TENANT_ID}/${STAGE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // <<< [수정] 복제 요청 시 description 포함 (백엔드 스키마에 따라 달라질 수 있음) ---
    // 백엔드가 clone_from_id를 받아서 description까지 복사한다면 이 필드는 불필요할 수 있습니다.
    // 만약 description을 명시적으로 보내야 한다면 scenarioToClone.description을 추가합니다.
    body: JSON.stringify({
      name: newName,
      job: scenarioToClone.job,
      clone_from_id: scenarioToClone.id,
      category_id: 'DEV_1000_S_1_1_1',
      // description: scenarioToClone.description // 필요시 추가
    }),
    // --- [수정 끝] >>>
  });
  const data = await handleApiResponse(response);
  // <<< [수정] 응답에 description 추가 ---
  return { ...data, startNodeId: data.start_node_id, description: data.description || '' };
  // --- [수정 끝] >>>
};

// <<< [수정] description 파라미터 추가 ---
export const renameScenario = async ({ oldScenario, newName, job, description }: any) => {
// --- [수정 끝] >>>
    const response = await fetch(`${API_BASE_URL}/${TENANT_ID}/${STAGE_ID}/${oldScenario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // <<< [수정] 요청 본문에 description 추가 ---
        body: JSON.stringify({ name: newName, job: job, description: description }),
        // --- [수정 끝] >>>
    });
    const data = await handleApiResponse(response);
     // <<< [수정] 응답에 description 추가 ---
    return { ...data, startNodeId: data.start_node_id, description: data.description || '' };
     // --- [수정 끝] >>>
};

export const deleteScenario = async ({ scenarioId }: any) => {
    const response = await fetch(`${API_BASE_URL}/${TENANT_ID}/${STAGE_ID}/${scenarioId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

export const fetchScenarioData = async ({ scenarioId }: any) => {
    if (!scenarioId) return { nodes: [], edges: [], startNodeId: null, description: '' }; // description 기본값 추가
    const response = await fetch(`${API_BASE_URL}/${TENANT_ID}/${STAGE_ID}/${scenarioId}`);
    const data = await handleApiResponse(response);
    // <<< [수정] description 로드 추가 ---
    return {
        ...data,
        nodes: data.nodes || [],
        edges: data.edges || [],
        startNodeId: data.start_node_id || null,
        description: data.description || '' // description 추가
    };
    // --- [수정 끝] >>>
};

export const saveScenarioData = async ({ scenario, data }: any) => {
    if (!scenario || !scenario.id) {
        throw new Error('No scenario selected to save.');
    }

    // <<< [수정] payload에 description 포함 ---
    const payload = {
        ten_id: TENANT_ID,
        stg_id: STAGE_ID,
        category_id: "DEV_1000_S_1_1_1",
        name: scenario.name,
        job: scenario.job,
        description: scenario.description || '', // description 추가
        nodes: data.nodes,
        edges: data.edges,
        start_node_id: data.startNodeId
    };
    // --- [수정 끝] >>>

    const response = await fetch(`${API_BASE_URL}/${TENANT_ID}/${STAGE_ID}/${scenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const responseData = await handleApiResponse(response);
    // <<< [수정] 응답에 description 추가 ---
    return { ...responseData, startNodeId: responseData.start_node_id, description: responseData.description || '' };
    // --- [수정 끝] >>>
};