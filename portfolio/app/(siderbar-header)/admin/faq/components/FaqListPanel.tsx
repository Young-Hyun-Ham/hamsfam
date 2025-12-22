"use client";

import useAdminFaqStore from "../store";
import type { AdminFaq } from "../types";
import FaqSearchBar from "./FaqSearchBar";

export default function FaqListPanel({
  items,
  selectedId,
}: {
  items: AdminFaq[];
  selectedId: string | null;
}) {
  const { 
    select, 
    openCreate, 
    openEdit, 
    openDelete, 
    page, 
    hasMore, 
    nextPage, 
    prevPage, 
    loading,
  } = useAdminFaqStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="text-sm font-semibold">FAQ 관리</div>
        <button
          className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white"
          onClick={openCreate}
        >
          + FAQ 추가
        </button>
      </div>

      <FaqSearchBar />

      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">데이터가 없습니다.</div>
        ) : (
          <ul className="space-y-2 p-3">
            {items.map((it) => {
              const active = it.id === selectedId;
              return (
                <li
                  key={it.id}
                  className={[
                    "cursor-pointer rounded-lg bg-white p-4",
                    "shadow-sm hover:shadow-md transition-shadow",
                    active ? "ring-1 ring-gray-200" : "",
                  ].join(" ")}
                  onClick={() => select(it.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {it.question}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px]">
                          {it.category}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px]">
                          {it.status}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px]">
                          order:{it.order}
                        </span>
                        {it.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-gray-100 px-2 py-0.5 text-[11px]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        className="rounded-md border px-2 py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(it.id);
                        }}
                      >
                        수정
                      </button>
                      <button
                        className="rounded-md border px-2 py-1 text-xs text-red-600"
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

      <div className="p-3 shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            페이지 {page} {loading ? "(로딩중...)" : ""}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-40"
              disabled={loading || page <= 1}
              onClick={prevPage}
            >
              이전
            </button>
            <button
              className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-40"
              disabled={loading || !hasMore}
              onClick={nextPage}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
