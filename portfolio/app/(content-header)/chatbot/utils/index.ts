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

function getByPath(obj: any, path: string) {
  if (!obj) return undefined;
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function toPrintable(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2); // 객체/배열은 보기 좋게
  } catch {
    return String(v);
  }
}

// {{slotKey}} 를 slotValues[slotKey] 값으로 치환하는 헬퍼
function resolveTemplate(text: string, slots: Record<string, any>): string {
  if (!text) return "";

  // 재귀(반복) 치환: slot 값에 또 {{...}}가 들어있을 수 있음
  let out = text;

  for (let i = 0; i < 3; i++) {
    const next = out.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey) => {
      const key = rawKey.trim(); // 예: "selectedRow.id" 또는 "header(scenarios,id)"

      // special은 "value"가 아니라 "key(표현식)"로 판단해야 함
      const special = resolveSpecialExpression(key, slots);
      if (special !== undefined && special !== null) {
        return String(special);
      }

      // 기존 slots[key] 대신 중첩 경로 접근
      let value = getNestedValue(slots, key);

      if (value === undefined || value === null) return `{{${key}}}`;

      // 원시값
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return String(value);
      }

      // 객체/배열
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    });

    if (next === out) break;
    out = next;
  }

  return out;
}

export function stripMustache(expr: string) {
  const s = String(expr ?? "").trim();
  // {{ ... }} 형태면 바깥만 제거
  const m = /^\{\{\s*([\s\S]*?)\s*\}\}$/.exec(s);
  return m ? m[1].trim() : s;
}

// header(배열키, 컬럼키) 패턴: {{header(abcd, id)}}
function resolveSpecialExpression(expr: string, slots: Record<string, any>) {
  // console.log("resolveSpecialExpression ======> ", stripMustache(expr));
  // header(a, b) 패턴
  const headerMatch = /^header\(\s*([^,]+?)\s*,\s*([^)]+)\s*\)$/.exec(stripMustache(expr));
  if (headerMatch) {
    const arrayPath = headerMatch[1].trim();
    const field = headerMatch[2].trim();

    const arr = getNestedValue(slots, arrayPath);
    if (Array.isArray(arr)) {
      return JSON.stringify(
        arr
          .map(row => row?.[field])
          .filter(v => v !== undefined)
      );
    }
    return null;
  }
}

// getNestedValue 함수는 변경 없음
function getNestedValue(obj: any, path: any) {
  if (!path) return undefined;
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  return normalizedPath.split('.').reduce((acc: any, part: any) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
};

// 옵션 키 정규화 헬퍼 추가
function normalizeOptionsKey(key: string): string {
  if (!key) return key;

  const trimmed = key.trim();
  // 이미 {{ }} 형태면 그대로
  if (/^\{\{\s*[^}]+\s*\}\}$/.test(trimmed)) {
    return trimmed;
  }
  // 아니면 {{key}} 형태로 감싸기
  return `{{${trimmed}}}`;
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
  normalizeOptionsKey,
  makeStepId,
  sleep,
};