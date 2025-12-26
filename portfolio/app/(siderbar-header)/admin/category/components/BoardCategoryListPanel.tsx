// app/(sidebar-header)/admin/category/components/BoardCategoryListPanel.tsx
"use client";

import useAdminBoardCategoryStore, { selectFilteredCategories } from "../store";
import type { AdminBoardCategory } from "../types";
import { useMemo } from "react";

function StatusPill({ v }: { v: AdminBoardCategory["status"] }) {
  const cls =
    v === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-gray-100 text-gray-600";
  return <span className={`rounded-md px-2 py-0.5 text-[11px] ${cls}`}>{v}</span>;
}

export default function BoardCategoryListPanel() {
  const { items, selectedId, query, setQuery, select, openCreate, openEdit, openDelete } =
    useAdminBoardCategoryStore();

  const filtered = useMemo(() => selectFilteredCategories(items, query), [items, query]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm font-semibold">게시판 카테고리</div>
          <div className="mt-1 text-xs text-gray-500">
            카테고리별로 게시판을 구성합니다.
          </div>
        </div>

        <button
          className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:shadow-md focus:outline-none"
          onClick={openCreate}
        >
          + 카테고리 추가
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 px-5 pb-4 md:flex-row md:items-center">
        <div className="flex-1">
          <input
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:shadow-md"
            placeholder="검색 (이름 / slug / 설명)"
            value={query.keyword ?? ""}
            onChange={(e) => setQuery({ keyword: e.target.value })}
          />
        </div>

        <select
          className="rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition focus:outline-none focus:shadow-md"
          value={query.status ?? "all"}
          onChange={(e) => setQuery({ status: e.target.value as any })}
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="px-2 py-6 text-sm text-gray-500">데이터가 없습니다.</div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((it) => {
              const active = it.id === selectedId;
              return (
                <li
                  key={it.id}
                  className={[
                    "cursor-pointer rounded-2xl bg-white p-4",
                    "shadow-sm hover:shadow-md transition-shadow",
                    active ? "ring-1 ring-gray-200" : "",
                  ].join(" ")}
                  onClick={() => select(it.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">{it.name}</div>
                        <StatusPill v={it.status} />
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="rounded-md bg-gray-50 px-2 py-0.5 shadow-inner">
                          slug: <b className="font-mono">{it.slug}</b>
                        </span>
                        <span className="rounded-md bg-gray-50 px-2 py-0.5 shadow-inner">
                          order: {it.order}
                        </span>
                      </div>

                      {it.description ? (
                        <div className="mt-2 line-clamp-2 text-xs text-gray-600">
                          {it.description}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm transition hover:shadow-md focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(it.id);
                        }}
                      >
                        수정
                      </button>
                      <button
                        className="rounded-lg bg-white px-3 py-2 text-xs text-red-600 shadow-sm transition hover:shadow-md focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDelete(it.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
