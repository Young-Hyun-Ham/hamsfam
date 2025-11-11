// src/utils/gridUtils.js

/**
 * displayKeys 객체 배열을 'key(Label),key2' 형태의 문자열로 변환합니다.
 * @param {Array<Object>|string} keys - [{key: 'name', label: 'My Name'}, ...]
 * @returns {string}
 */
export const formatDisplayKeys = (keys) => {
  if (!Array.isArray(keys)) return keys || ''; // 이전 버전(문자열) 호환
  return keys.map(k => {
    if (typeof k === 'string') return k; // 이전 버전(문자열 배열) 호환
    if (k.label && k.label !== k.key) {
      return `${k.key}(${k.label})`;
    }
    return k.key;
  }).join(',');
};

/**
 * 'key(Label),key2' 형태의 문자열을 displayKeys 객체 배열로 파싱합니다.
 * @param {string} value - 'name(My Name),email'
 * @returns {Array<Object>}
 */
export const parseDisplayKeys = (value) => {
  if (!value) return [];
  const keys = [];
  
  // 쉼표를 기준으로 먼저 나누고 각 항목을 정규식으로 처리
  value.split(',').forEach(part => {
    part = part.trim();
    if (part) {
      const match = part.match(/([^()]+)(?:\(([^)]+)\))?/);
      if (match) {
        const key = match[1] ? match[1].trim() : '';
        const label = match[2] ? match[2].trim() : key; // 괄호 안 레이블이 없으면 key를 label로 사용
        if (key) {
          keys.push({ key, label });
        }
      }
    }
  });
  
  return keys;
};