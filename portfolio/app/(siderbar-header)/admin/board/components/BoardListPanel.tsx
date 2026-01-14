// app/(sidebar-header)/admin/board/components/BoardListPanel.tsx
"use client";

import { useMemo } from "react";
import { useAdminBoardStore } from "../store";

function badge(category: string) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1";
  switch (category) {
    case "notice":
      return `${base} bg-indigo-50 text-indigo-700 ring-indigo-200`;
    case "faq":
      return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
    case "qna":
      return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    default:
      return `${base} bg-gray-50 text-gray-700 ring-gray-200`;
  }
}

export default function BoardListPanel() {
  const rows = useAdminBoardStore((s) => s.rows);
  const paging = useAdminBoardStore((s) => s.paging);

  const open = useAdminBoardStore((s) => s.open);

  const empty = useMemo(() => rows.length === 0, [rows.length]);

  return (
    <div className="min-h-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-gray-600">
          총 <span className="font-semibold text-gray-900">{paging.total}</span>건
        </div>
      </div>

      <div className="px-4 pb-4">
        {empty ? (
          <div className="rounded-3xl bg-gray-50 p-10 text-center text-sm text-gray-500 ring-1 ring-black/5">
            데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="group rounded-3xl bg-white p-4 shadow-sm shadow-black/5 ring-1 ring-black/5
                           hover:shadow-lg hover:shadow-black/10 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={badge(r.category)}>{r.category}</span>
                      {r.isSecret ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 ring-1 ring-black/5">
                          🔒 비밀글
                        </span>
                      ) : null}
                    </div>

                    <button
                      onClick={() => open({ type: "detail", id: r.id })}
                      className="mt-2 block w-full text-left"
                    >
                      <div className="truncate text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition">
                        {r.title}
                      </div>
                      {/* <div className="mt-1 line-clamp-2 text-sm text-gray-600 whitespace-pre-wrap">
                        {r.content}
                      </div> */}
                    </button>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>작성자: {r.authorName}</span>
                      <span className="text-gray-300">•</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                      {r.tags?.length ? (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="truncate">#{r.tags.join(" #")}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => open({ type: "edit", id: r.id })}
                      className="rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-700
                                 shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => open({ type: "delete", id: r.id })}
                      className="rounded-full bg-rose-600 px-3 py-2 text-xs font-medium text-white
                                 shadow-sm shadow-rose-600/20 ring-1 ring-rose-700/30 hover:bg-rose-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
