"use client";

import { useEffect, useMemo, useState } from "react";
import type { KnowledgeEntity } from "../../types";

type Mode = "create" | "edit";

type EntityEntry = {
  value: string;
  synonyms: string[];
  // UI only
  synInput: string;
};

type Props = {
  open: boolean;
  mode: Mode;
  initial?: KnowledgeEntity | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    displayName: string;
    description?: string;
    values: { value: string; synonyms: string[] }[];
  }) => Promise<void> | void;
};

function uniqNonEmpty(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export default function EntityModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<EntityEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const title = useMemo(
    () => (mode === "create" ? "엔티티 추가" : "엔티티 수정"),
    [mode]
  );

  useEffect(() => {
    if (!open) return;

    const e = initial ?? null;
    setName(e?.name ?? "");
    setDisplayName(e?.displayName ?? "");
    setDescription(e?.description ?? "");

    const rows: EntityEntry[] =
      (e?.values ?? []).map((v: any) => ({
        value: String(v?.value ?? ""),
        synonyms: Array.isArray(v?.synonyms)
          ? v.synonyms.map((s: any) => String(s))
          : [],
        synInput: "",
      })) ?? [];

    // 기본 1줄은 보여주자(UX)
    setEntries(rows.length > 0 ? rows : [{ value: "", synonyms: [], synInput: "" }]);
  }, [open, initial]);

  if (!open) return null;

  const canSave = name.trim().length > 0;

  const addEntry = () => {
    setEntries((prev) => [...prev, { value: "", synonyms: [], synInput: "" }]);
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntryValue = (idx: number, value: string) => {
    setEntries((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, value } : row))
    );
  };

  const updateSynInput = (idx: number, synInput: string) => {
    setEntries((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, synInput } : row))
    );
  };

  const addSynonym = (idx: number, syn: string) => {
    const trimmed = syn.trim();
    if (!trimmed) return;

    setEntries((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = uniqNonEmpty([...(row.synonyms ?? []), trimmed]);
        return { ...row, synonyms: next, synInput: "" };
      })
    );
  };

  const removeSynonym = (idx: number, syn: string) => {
    setEntries((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        return {
          ...row,
          synonyms: (row.synonyms ?? []).filter((s) => s !== syn),
        };
      })
    );
  };

  const normalizedValues = entries
    .map((row) => ({
      value: row.value.trim(),
      synonyms: uniqNonEmpty(row.synonyms ?? []),
    }))
    .filter((row) => row.value.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-800"
            onClick={onClose}
            disabled={saving}
          >
            닫기
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* 상단 정보 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-gray-600">
                이름(name) *
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: coffee"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-600">
                표시 이름(displayName)
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="예: 커피"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-600">
              설명(description)
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명"
            />
          </div>

          {/* 엔트리 리스트 */}
          <div className="
            rounded-lg 
            bg-white 
            p-3 
            shadow-sm 
            ring-1 ring-black/5
            space-y-4 
            flex-1 min-h-0 flex flex-col
          ">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-700">
                Entries / Synonyms
              </div>
              <div className="text-[11px] text-gray-500">
                총 {normalizedValues.length}개
              </div>
            </div>

            <div className="space-y-2">
              {/* 헤더(데스크톱 느낌) */}
              <div className="hidden grid-cols-[280px_1fr_44px] gap-2 px-2 text-[11px] font-semibold text-gray-500 md:grid">
                <div>Entry Name</div>
                <div>Synonym (Enter로 추가 / ×로 삭제)</div>
                <div />
              </div>

              {entries.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 rounded-md bg-white p-2 shadow-sm md:grid-cols-[280px_1fr_44px]"
                >
                  {/* Entry Name */}
                  <div>
                    <div className="md:hidden text-[11px] font-semibold text-gray-500 mb-1">
                      Entry Name
                    </div>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={row.value}
                      onChange={(e) => updateEntryValue(idx, e.target.value)}
                      placeholder="예: 에스프레소"
                    />
                  </div>

                  {/* Synonyms */}
                  <div>
                    <div className="md:hidden text-[11px] font-semibold text-gray-500 mb-1">
                      Synonym
                    </div>

                    <div className="
                        flex
                        min-h-10
                        flex-wrap
                        items-start
                        gap-2
                        rounded-md
                        border
                        bg-white
                        px-3
                        pt-1
                        pb-1
                      "
                    >
  {(row.synonyms ?? []).map((syn) => (
    <span
      key={syn}
      className="
        inline-flex
        items-center
        gap-1
        rounded-full
        border
        bg-gray-50
        px-2
        py-1
        text-[12px]
        text-gray-800
      " 
    >
      {syn}
      <button
        type="button"
        className="ml-0.5 rounded-full px-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        onClick={() => removeSynonym(idx, syn)}
        aria-label="remove"
      >
        ×
      </button>
    </span>
  ))}

  <input
    className="
      min-w-[160px]
      flex-1
      border-0
      bg-transparent
      px-0
      py-0
      text-sm
      outline-none
      h-8
    "
    value={row.synInput}
    onChange={(e) => updateSynInput(idx, e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSynonym(idx, row.synInput);
      }
      if (e.key === "Backspace" && !row.synInput && row.synonyms.length) {
        const last = row.synonyms[row.synonyms.length - 1];
        removeSynonym(idx, last);
      }
    }}
    placeholder="동의어 입력 후 Enter"
  />
</div>
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end md:justify-center">
                    <button
                      type="button"
                      className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md border text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                      onClick={() => removeEntry(idx)}
                      title="삭제"
                      aria-label="delete row"
                      disabled={entries.length <= 1}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button
                type="button"
                className="rounded-md border bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                onClick={addEntry}
              >
                + Add Entry
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={!canSave || saving}
            onClick={async () => {
              try {
                setSaving(true);
                await onSubmit({
                  name: name.trim(),
                  displayName: displayName.trim() || name.trim(),
                  description: description.trim(),
                  values: normalizedValues,
                });
                onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "저장중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
