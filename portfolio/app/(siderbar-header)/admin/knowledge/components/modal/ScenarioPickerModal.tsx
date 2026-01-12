"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "@/lib/axios";

type ScenarioItem = {
  id: string;
  name: string;
  description?: string;
  updated_at?: string | null;
  created_at?: string | null;
  projectId?: string | null;
};

type Props = {
  open: boolean;
  projectId?: string | null;
  initialSelectedId?: string | null;

  onClose: () => void;
  onSelect: (s: ScenarioItem) => void;
};

function fmt(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScenarioPickerModal({
  open,
  projectId,
  initialSelectedId,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ScenarioItem[]>([]);
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(initialSelectedId ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setError(null);
    setActiveId(initialSelectedId ?? null);
  }, [open, initialSelectedId]);

  const load = async (keyword?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/admin/firebase/knowledge/projects/scenarios", {
        params: {
          projectId: projectId || undefined,
          q: (keyword ?? q).trim() || undefined,
          limit: 100,
        },
      });
      setItems(res.data?.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "시나리오 목록 조회 실패");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    // ✅ 모달 열릴 때 1회 로드
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const active = useMemo(
    () => items.find((x) => x.id === activeId) ?? null,
    [items, activeId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4">
      <div 
        className="
          w-full max-w-3xl
          rounded-2xl
          bg-white
          shadow-[0_20px_40px_rgba(0,0,0,0.15)]
          ring-1 ring-black/5
          overflow-hidden
        "
      >
        {/* header */}
        <div
          className="
            flex items-center justify-between
            px-5 py-4
            bg-white
            shadow-[0_6px_12px_rgba(0,0,0,0.06)]
          "
        >
          <div>
            <div className="text-sm font-bold text-gray-900">시나리오 선택</div>
            <div className="mt-1 text-[12px] text-gray-500">
              scenarios 컬렉션에서 선택한 시나리오를 인텐트에 연결합니다.
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* search */}
        <div className="px-5 py-4 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="시나리오 이름/설명/ID 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") load(e.currentTarget.value);
                }}
              />
            </div>
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
              disabled={loading}
              onClick={() => load(q)}
            >
              검색
            </button>
          </div>

          {error && (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* body */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* list */}
          <div className="pr-3">
            <div className="max-h-[420px] overflow-auto p-3 bg-gray-50/60">
              {loading && (
                <div className="p-4 text-sm text-gray-500">불러오는 중...</div>
              )}

              {!loading && items.length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  표시할 시나리오가 없습니다.
                </div>
              )}

              {!loading &&
                items.map((s) => {
                  const active = s.id === activeId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className={[
                        "w-full text-left px-4 py-3 mb-2 rounded-xl transition",
                        "bg-white shadow-sm ring-1 ring-black/5",
                        "hover:shadow-md",
                        active ? "ring-2 ring-indigo-300 shadow-md" : "",
                      ].join(" ")}
                    >
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {s.name || "(이름 없음)"}
                      </div>
                      <div className="mt-1 text-[12px] text-gray-500 line-clamp-2">
                        {s.description || "설명 없음"}
                      </div>
                      <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-2">
                        <span className="truncate">id: {s.id}</span>
                        {s.updated_at && <span>updated: {fmt(s.updated_at)}</span>}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* preview */}
          <div className="p-4 pl-3">
            <div className="text-[12px] font-semibold text-gray-700">선택된 시나리오</div>

            {!active ? (
              <div className="mt-2 rounded-md border border-dashed p-3 text-sm text-gray-500">
                왼쪽 목록에서 시나리오를 선택하세요.
              </div>
            ) : (
              <div className="mt-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="text-sm font-bold text-gray-900">{active.name}</div>
                <div className="mt-1 text-[12px] text-gray-600 whitespace-pre-wrap">
                  {active.description || "설명 없음"}
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  <div>id: {active.id}</div>
                  {active.updated_at && <div>updated: {fmt(active.updated_at)}</div>}
                  {active.created_at && <div>created: {fmt(active.created_at)}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div
          className="
            flex items-center justify-end gap-2
            px-5 py-4
            bg-white
            shadow-[0_-8px_16px_rgba(0,0,0,0.06)]
          "
        >
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            취소
          </button>

          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
            disabled={!active}
            onClick={() => {
              if (!active) return;
              onSelect(active);
              onClose();
            }}
          >
            선택
          </button>
        </div>
      </div>
    </div>
  );
}
