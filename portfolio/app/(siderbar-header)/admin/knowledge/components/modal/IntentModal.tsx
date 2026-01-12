"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { KnowledgeIntent } from "../../types";
import ScenarioPickerModal from "./ScenarioPickerModal";

type Mode = "create" | "edit";

type SelectedScenario = { id: string; name: string };

type PhraseRow = {
  id: string;
  text: string;
  selected: boolean;
  starred: boolean; // UI only (지금은 저장 안해도 됨)
};

type Props = {
  open: boolean;
  mode: Mode;
  initial?: KnowledgeIntent | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    displayName: string;
    description?: string;
    trainingPhrases: string[];
    isFallback: boolean;
    selectedScenario: {
      id: string; 
      name: string;
    }
  }) => Promise<void> | void;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(v: string) {
  return v.replace(/\s+/g, " ").trim();
}

function uniq(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const v = normalizeText(String(raw ?? ""));
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export default function IntentModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  // ✅ training phrases UI state
  const [addInput, setAddInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PhraseRow[]>([]);

  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 5;

  const title = useMemo(
    () => (mode === "create" ? "인텐트 추가" : "인텐트 수정"),
    [mode]
  );
  
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<SelectedScenario>(
    initial?.scenarioKey ? { id: initial.scenarioKey, name: initial.scenarioTitle ?? "" } : {id: "", name: ""}
  );

  useEffect(() => {
    if (!open) return;

    const it = initial ?? null;
    setName(it?.name ?? "");
    setDisplayName(it?.displayName ?? "");
    setDescription(it?.description ?? "");
    setIsFallback(Boolean(it?.isFallback ?? false));
    setSelectedScenario({id: it?.scenarioKey ?? "", name: it?.scenarioTitle ?? ""});

    const phrases = uniq((it?.trainingPhrases ?? []).map(String));
    const list: PhraseRow[] = phrases.map((p) => ({
      id: makeId(),
      text: p,
      selected: false,
      starred: false,
    }));
    setRows(list);
    setAddInput("");
    setSearch("");
    setPage(1);
  }, [open, initial]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.text.toLowerCase().includes(q));
  }, [rows, search]);

  const totalCount = rows.length;
  const filteredCount = filteredRows.length;

  const selectedCount = useMemo(
    () => rows.filter((r) => r.selected).length,
    [rows]
  );

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / pageSize));
  }, [filteredRows.length]);

  useEffect(() => {
    // ✅ 검색/삭제 등으로 필터 결과가 줄어서 page가 범위를 벗어나면 보정
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // const allSelectedInFilter =
  //   filteredRows.length > 0 && filteredRows.every((r) => r.selected);
  const allSelectedInPage =
    pagedRows.length > 0 && pagedRows.every((r) => r.selected);

  const canSave = name.trim().length > 0;

  const addOne = (text: string) => {
    const t = normalizeText(text);
    if (!t) return;

    setRows((prev) => {
      const exists = prev.some((x) => x.text.toLowerCase() === t.toLowerCase());
      if (exists) return prev;
      return [
        ...prev,
        { id: makeId(), text: t, selected: false, starred: false },
      ];
    });
  };

  const addManyFromMultiline = (text: string) => {
    // 혹시 사용자가 여러 줄 붙여넣어도 등록되게
    const parts = text
      .split(/\r?\n/)
      .map((s) => normalizeText(s))
      .filter(Boolean);
    const unique = uniq(parts);
    unique.forEach(addOne);
  };

  const deleteSelected = () => {
    setRows((prev) => prev.filter((r) => !r.selected));
  };

  // const toggleSelectAllInFilter = (checked: boolean) => {
  //   const ids = new Set(filteredRows.map((r) => r.id));
  //   setRows((prev) =>
  //     prev.map((r) => (ids.has(r.id) ? { ...r, selected: checked } : r))
  //   );
  // };
  const toggleSelectAllInPage = (checked: boolean) => {
    const ids = new Set(pagedRows.map((r) => r.id));
    setRows((prev) =>
      prev.map((r) => (ids.has(r.id) ? { ...r, selected: checked } : r))
    );
  };

  const toggleSelectRow = (id: string, checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: checked } : r))
    );
  };

  const toggleStar = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, starred: !r.starred } : r))
    );
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const trainingPhrases = rows.map((r) => r.text);

  return (
    !open ? null : (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        onMouseDown={(e) => {
          // 오버레이 자체를 눌렀을 때만 닫기 (내부 클릭은 아래에서 막힘)
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="
            w-full max-w-4xl rounded-lg bg-white shadow-lg
            max-h-[calc(100dvh-50px)] overflow-hidden flex flex-col
          "
          onMouseDown={(e) => e.stopPropagation()}
        >
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

          <div 
            className="
              space-y-4 px-4 py-4
              flex-1 min-h-0 overflow-auto
            "
          >
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-gray-600">
                  이름(name) *
                </label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: greeting"
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
                  placeholder="예: 인사"
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
            
            <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5 space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_280px]">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600">
                    Add query <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        // 여러 줄 붙여넣기 대응
                        if (addInput.includes("\n")) addManyFromMultiline(addInput);
                        else addOne(addInput);
                        setAddInput("");
                      }
                    }}
                    placeholder="사용자 문장을 입력하고 Enter를 누르세요."
                  />
                  <div className="mt-1 text-[11px] text-gray-500">
                    여러 문장을 붙여넣으면 줄바꿈 기준으로 등록됩니다.
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600">
                    Search user query
                  </label>
                  <div className="relative mt-1">
                    <input
                      className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search user query"
                    />
                    {search ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700"
                        onClick={() => setSearch("")}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* list header */}
              <div className="mt-3 overflow-hidden rounded-lg border bg-white">
                <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelectedInPage}
                      onChange={(e) => toggleSelectAllInPage(e.target.checked)}
                    />
                    <span className="text-[11px] font-semibold text-gray-600">
                      All queries
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-gray-500">
                      표시 {filteredCount} / 전체 {totalCount}
                    </span>

                    <button
                      type="button"
                      className="text-red-600 hover:underline disabled:opacity-40"
                      onClick={deleteSelected}
                      disabled={selectedCount === 0}
                    >
                      Delete selected
                    </button>
                  </div>
                </div>

                {/* rows */}
                <div className="max-h-[320px] overflow-auto">
                  {pagedRows.length === 0 ? (
                    <div className="px-3 py-10 text-center text-xs text-gray-500">
                      등록된 문장이 없습니다. 상단 입력창에서 Enter로 추가해 주세요.
                    </div>
                  ) : (
                    pagedRows.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between border-b px-3 py-2 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={(e) => toggleSelectRow(r.id, e.target.checked)}
                          />
                          <span className="text-sm text-gray-800">{r.text}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* ⭐ UI만 (원하면 나중에 저장 구조 확장) */}
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                            title="favorite"
                            onClick={() => toggleStar(r.id)}
                          >
                            {r.starred ? "★" : "☆"}
                          </button>

                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                            title="delete"
                            onClick={() => deleteRow(r.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 border-t bg-white px-3 py-3">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border bg-gray-50 px-2 font-semibold">
                      {page}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span>{pageCount}</span>
                  </div>

                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-gray-500">
                총 {trainingPhrases.length}개
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                연결 시나리오
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="시나리오를 선택하세요"
                    value={
                      selectedScenario.id
                        ? `${selectedScenario.name} (${selectedScenario.id})`
                        : ""
                    }
                    readOnly
                  />
                  {selectedScenario && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100"
                      onClick={() => setSelectedScenario({id: "", name: ""})}
                      title="선택 해제"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setScenarioModalOpen(true)}
                  title="시나리오 검색"
                >
                  <Search size={16} />
                </button>
              </div>

              <p className="mt-1 text-[11px] text-gray-500">
                선택한 시나리오 ID가 인텐트 문서에 저장됩니다.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={isFallback}
                onChange={(e) => setIsFallback(e.target.checked)}
              />
              Fallback 인텐트로 지정
            </label>
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
                    trainingPhrases: trainingPhrases,
                    isFallback,
                    selectedScenario,
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

        {/* scenario modal */}
        <ScenarioPickerModal
          open={scenarioModalOpen}
          projectId={initial?.projectId ?? null}
          initialSelectedId={selectedScenario?.id ?? null}
          onClose={() => setScenarioModalOpen(false)}
          onSelect={(s) => setSelectedScenario({ id: s.id, name: s.name })}
        />
      </div>
    )
  );
}
