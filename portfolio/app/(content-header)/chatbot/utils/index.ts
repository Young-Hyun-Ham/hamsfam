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

export {
  cn,
  removeUndefinedDeep,
};