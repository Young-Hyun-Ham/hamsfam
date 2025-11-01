/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

type DiffCrud = 'C' | 'R' | 'U';
type DiffItem<T = any> = { id: string; crud: DiffCrud; before?: T; after?: T; changedKeys?: string[] };

function toArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  }
  return [];
}

function shallowEquals(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function changedKeysOf(a: any, b: any, ignore: readonly string[]) {
  const ig = new Set(ignore);
  const keys = new Set<string>([
    ...Object.keys(a ?? {}),
    ...Object.keys(b ?? {}),
  ]);
  const changed: string[] = [];
  for (const k of keys) {
    if (ig.has(k)) continue;
    if (!shallowEquals(a?.[k], b?.[k])) changed.push(k);
  }
  return changed;
}

/** prev vs next를 C/U/R로 표시한 diff 배열을 만든다. */
export function diffMcpLists<T extends { id?: string | number }>(
  prevInput: unknown,
  nextInput: unknown,
  ignore: readonly string[] = ['status', 'statusMessage']
): DiffItem<T>[] {
  const prev = toArray<T>(prevInput).filter(x => x?.id != null);
  const next = toArray<T>(nextInput).filter(x => x?.id != null);
  
  const prevMap = new Map<string, T>(prev.map(x => [String(x.id), x]));
  const nextMap = new Map<string, T>(next.map(x => [String(x.id), x]));
  const ids = new Set<string>([...prevMap.keys(), ...nextMap.keys()]);
  const diffs: DiffItem<T>[] = [];

  for (const id of ids) {
    const a = prevMap.get(id);
    const b = nextMap.get(id);

    if (!a && b) {
      // 신규
      diffs.push({ id, crud: 'C', after: b });
      continue;
    }
    if (a && b) {
      const changed = changedKeysOf(a, b, ignore);
      if (changed.length === 0) {
        diffs.push({ id, crud: 'R', before: a, after: b });
      } else {
        diffs.push({ id, crud: 'U', before: a, after: b, changedKeys: changed });
      }
    }
    // a가 있고 b가 없으면 삭제(D)
  }

  // next의 표시 순서를 따라가도록 정렬(선택)
  diffs.sort(
    (x, y) => next.findIndex((i) => i.id === x.id) - next.findIndex((i) => i.id === y.id)
  );
  return diffs;
}

// 쉼표 기준 CSV 문자열로 직렬화 (따옴표 제외, 공백 정리)
export const toCsv = (v: unknown): string => {
  if (v == null) return '';
  if (Array.isArray(v)) {
    return v.map(x => String(x).trim()).filter(Boolean).join(',');
  }
  if (typeof v === 'object') {
    // env 객체면 KEY=VALUE 토큰으로
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}=${String(val ?? '').trim()}`)
      .join(',');
  }
  // 이미 문자열이면 토큰 정리만
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(',');
};