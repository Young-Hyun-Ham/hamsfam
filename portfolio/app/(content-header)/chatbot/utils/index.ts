// chatbot/utils/index.ts

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function removeUndefinedDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedDeep);
  }
  if (value && typeof value === "object") {
    const result: any = {};
    Object.entries(value).forEach(([k, v]) => {
      if (v === undefined) return; // ⬅️ undefined 필드 제거
      result[k] = removeUndefinedDeep(v);
    });
    return result;
  }
  return value;
}

// {{slotKey}} 를 slotValues[slotKey] 값으로 치환하는 헬퍼
function resolveTemplate(text: string, slots: Record<string, any>): string {
  if (!text) return "";

  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey) => {
    const key = rawKey.trim(); // 공백 제거
    const value = slots[key];

    if (value === undefined || value === null) {
      // 슬롯에 없으면 그냥 빈 문자열로 치환 (원하면 {{key}} 그대로 남겨도 됨)
      return "";
    }

    // 문자열/숫자/불리언이면 그대로
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    // 객체/배열이면 JSON 문자열로 표시 (보기 좋게 하려면 여기에서 포맷 더 다듬어도 됨)
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  });
}

// Step ID 생성 헬퍼 추가
function makeStepId(base: string) {
  // base(노드 id)에 타임스탬프 + 랜덤 문자열을 붙여서 유니크하게
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export {
  cn,
  removeUndefinedDeep,
  resolveTemplate,
  makeStepId,
  sleep,
};