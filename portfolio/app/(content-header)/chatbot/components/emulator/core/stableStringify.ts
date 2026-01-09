// app/(content-header)/chatbot/components/emulator/core/stableStringify.ts
/** JSON stringify 안정화(키 정렬) */
export function stableStringify(v: any) {
  const seen = new WeakSet();
  return JSON.stringify(v, function (_key, value) {
    if (value && typeof value === "object") {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);

      if (Array.isArray(value)) return value;

      return Object.keys(value)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = (value as any)[k];
          return acc;
        }, {});
    }
    return value;
  });
}
