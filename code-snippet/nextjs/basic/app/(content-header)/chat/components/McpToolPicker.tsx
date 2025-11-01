// components/ToolPicker.tsx
"use client";
import { useMemo, useState } from "react";

export type ToolUi = {
  oaName: string;   // ns__tool
  mcpId: string;
  ns: string;       // 네임스페이스 표시용
  name: string;     // MCP 원래 툴 이름
};

export function ToolPicker({
  tools,
  recommended,
  onRun,
  onClose,
}: {
  tools: ToolUi[];
  recommended: string[];
  onRun: (items: { oaName: string; args?: any }[]) => void;
  onClose?: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>(
    () => Object.fromEntries(tools.map(t => [t.oaName, recommended.includes(t.oaName)]))
  );
  const [argsMap, setArgsMap] = useState<Record<string, string>>({});

  const chosen = useMemo(() => tools.filter(t => selected[t.oaName]), [tools, selected]);

  return (
    <div className="w-full max-w-3xl rounded-2xl border shadow p-4 bg-white dark:bg-zinc-900 dark:text-zinc-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">사용 가능한 MCP 툴</h3>
        <div className="flex gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >닫기</button>
          )}
          <button
            onClick={() => {
              const items = chosen.map(t => {
                let parsed: any = undefined;
                const raw = argsMap[t.oaName];
                if (raw && raw.trim()) {
                  try { parsed = JSON.parse(raw); } catch { parsed = undefined; }
                }
                return { oaName: t.oaName, args: parsed };
              });
              onRun(items);
            }}
            className="px-4 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black"
          >선택한 툴 실행</button>
        </div>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
        {tools.map(t => (
          <div key={t.oaName} className="rounded-xl border p-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!selected[t.oaName]}
                onChange={e => setSelected(s => ({ ...s, [t.oaName]: e.target.checked }))}
              />
              <span className="font-medium">{t.ns} · {t.name}</span>
              <span className="text-xs text-zinc-500 ml-2">({t.oaName})</span>
            </label>

            {selected[t.oaName] && (
              <div className="mt-2">
                <p className="text-xs text-zinc-500 mb-1">인자(JSON) — 비워두면 기본값</p>
                <textarea
                  className="w-full text-sm p-2 rounded-lg border min-h-[72px] font-mono"
                  placeholder='{"query":"keyword","limit":5}'
                  value={argsMap[t.oaName] ?? ""}
                  onChange={e => setArgsMap(m => ({ ...m, [t.oaName]: e.target.value }))}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-sm text-zinc-500">
        추천: {recommended.length ? recommended.join(", ") : "없음"}
      </div>
    </div>
  );
}