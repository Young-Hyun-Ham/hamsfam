// src/backendService.js

import * as firebaseApi from '@/app/api/builder/firebaseApi';
import * as fastApi from '@/app/api/builder/fastApi';
import { interpolateMessage, getNestedValue } from '../utils/simulatorUtils';
import { useBuilderStore } from '../store/index-bak';

const services: any = {
  firebase: firebaseApi,
  fastapi: fastApi,
};

const getService = (backend: any) => {
  const service = services[backend];
  if (!service) {
    throw new Error(`Invalid backend specified: ${backend}`);
  }
  return service;
};

export const fetchScenarios = (backend: any, args?: any) => getService(backend).fetchScenarios(args);
// <<< [수정] description 전달 ---
export const createScenario = (backend: any, args: any) => getService(backend).createScenario(args); // args에 description 포함되어 전달됨
export const renameScenario = (backend: any, args: any) => getService(backend).renameScenario(args); // args에 description 포함되어 전달됨
// --- [수정 끝] >>>
export const deleteScenario = (backend: any, args: any) => getService(backend).deleteScenario(args);
export const fetchScenarioData = (backend: any, args: any) => getService(backend).fetchScenarioData(args);
export const saveScenarioData = (backend: any, args: any) => getService(backend).saveScenarioData(args);
// <<< [수정] clone 시 description도 복사되도록 가정 (백엔드 로직에 따라 달라질 수 있음) ---
export const cloneScenario = (backend: any, args: any) => getService(backend).cloneScenario(args); // args에 description 정보 필요시 추가 전달
// --- [수정 끝] >>>

// --- 💡 [수정] lastUsedAt 업데이트 함수 추상화 ---
export const updateScenarioLastUsed = (backend: any, args: any) => getService(backend).updateScenarioLastUsed(args);
// --- 💡 [수정 끝] ---


// --- 💡 [수정] API 템플릿 함수들 추상화 ---
export const fetchApiTemplates = (backend: any, args: any) => getService(backend).fetchApiTemplates(args);
export const saveApiTemplate = (backend: any, args: any) => getService(backend).saveApiTemplate(args);
export const deleteApiTemplate = (backend: any, args: any) => getService(backend).deleteApiTemplate(args);

// --- 💡 [수정] Form 템플릿 함수들 추상화 ---
export const fetchFormTemplates = (backend: any, args: any) => getService(backend).fetchFormTemplates(args);
export const saveFormTemplate = (backend: any, args: any) => getService(backend).saveFormTemplate(args);
export const deleteFormTemplate = (backend: any, args: any) => getService(backend).deleteFormTemplate(args);
// --- 💡 [수정 끝] ---


export const testApiCall = async (apiCall: any) => {
  // ... (기존 API 테스트 로직) ...
  const { slots } = useBuilderStore.getState();
  const interpolatedUrl = interpolateMessage(apiCall.url, slots);
  const interpolatedHeaders = JSON.parse(interpolateMessage(apiCall.headers || '{}', slots));

  const rawBody = apiCall.body || '{}';
  const finalBody = interpolateMessage(rawBody, slots);

  const options = {
    method: apiCall.method,
    headers: { 'Content-Type': 'application/json', ...interpolatedHeaders },
    body: (apiCall.method !== 'GET' && apiCall.method !== 'HEAD') ? finalBody : undefined,
  };

  const response = await fetch(interpolatedUrl, options);

  let result;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
      try {
          result = await response.json();
      } catch (e) {
          result = await response.text();
      }
  } else {
      result = await response.text();
  }

  if (!response.ok) {
      const errorMessage = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }

  return result;
};