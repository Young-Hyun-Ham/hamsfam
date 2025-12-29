// app/(content-header)/board/[slug]/components/BoardListPanel.tsx
"use client";

import usePublicBoardStore from "../store";
import type { BoardPost } from "../types";
import BoardSearchBar from "./BoardSearchBar";

export default function BoardListPanel({
  items,
  selectedId,
}: {
  items: BoardPost[];
  selectedId: string | null;
}) {
  const { category, select, fetchMore, page, openCreate, loading } =
    usePublicBoardStore();

  const canWrite = Boolean(category?.edit);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="text-sm font-semibold">
            {category?.name ?? category?.slug ?? "카테고리 로딩중..."}
          </div>
        </div>

        {/* loading 중엔 버튼 비활성/스켈레톤 느낌 */}
        {(!canWrite || loading) ? null : (
        <button
          onClick={openCreate}
          disabled={!canWrite || loading}
          className={[
            "rounded-lg px-3 py-1.5 text-xs",
            canWrite && !loading
              ? "bg-black text-white hover:bg-gray-800"
              : "bg-gray-200 text-gray-500 cursor-not-allowed",
          ].join(" ")}
          title={!canWrite ? "글쓰기 권한이 없습니다." : ""}
        >
          글쓰기
        </button>
        )}
      </div>

      <BoardSearchBar />

      {/* List */}
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">게시글이 없습니다.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const active = it.id === selectedId;
              return (
                <li
                  key={it.id}
                  onClick={() => select(it.id)}
                  className={[
                    "cursor-pointer rounded-xl bg-white p-4 transition",
                    "shadow-sm hover:shadow-md",
                    active ? "ring-1 ring-gray-200" : "",
                  ].join(" ")}
                >
                  <div className="truncate text-sm font-medium">{it.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="truncate">
                      {it.authorName ? `작성자: ${it.authorName}` : "작성자: -"}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>{it.createdAt ?? "-"}</span>

                    {it.hasPassword ? (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-black/5">
                          🔒 보호글
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(it.tags ?? []).slice(0, 4).map((t: string) => (
                      <span
                        key={t}
                        className="rounded-2xl bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700 shadow-sm ring-1 ring-black/5"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Paging */}
      {page.hasMore && (
        <div className="p-3">
          <button
            onClick={fetchMore}
            className="
              w-full
              rounded-2xl
              bg-white
              px-4 py-3
              text-sm font-medium text-gray-700
              shadow-[0_10px_28px_rgba(0,0,0,0.08)]
              ring-1 ring-black/5
              transition
              hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)]
              hover:bg-gray-50
              active:scale-[0.98]
            "
          >
            더보기
          </button>
        </div>
      )}
    </div>
  );
}
