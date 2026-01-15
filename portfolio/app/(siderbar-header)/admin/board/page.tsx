// app/(sidebar-header)/admin/board/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { selectFilteredPosts, useAdminBoardStore } from "./store";
import BoardSearchBar from "./components/BoardSearchBar";
import BoardListPanel from "./components/BoardListPanel";
import BoardPagination from "./components/BoardPagination";
import BoardUpsertModal from "./components/modal/BoardUpsertModal";
import BoardDetailModal from "./components/modal/BoardDetailModal";
import BoardDeleteModal from "./components/modal/BoardDeleteModal";

export default function AdminBoardPage() {
  const {
    rows,
    modal,
    close,
    query,
    paging,
    fetchList,
  } = useAdminBoardStore();

  useEffect(() => {
    const searchData = { ...query, ...paging, };
    fetchList({ ...searchData });
  }, []);

  const filtered = useMemo(() => selectFilteredPosts(rows, query), [rows, query]);

  return (
    <>
      {/* 브라우저 비번매니저 오토필 방지용 더미 필드 (username/password를 여기로 유도) */}
      <div className="hidden" aria-hidden="true">
        <input type="text" name="fake-username" autoComplete="username" />
        <input type="password" name="fake-password" autoComplete="current-password" />
      </div>

      <div className="h-full min-h-0 p-6">
        <div className="mx-auto w-full max-w-6xl">
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">관리자 게시판</h1>
              <p className="mt-1 text-sm text-gray-500">
                목록/검색/페이징/글쓰기/상세/삭제
              </p>
            </div>

            <button
              onClick={() => useAdminBoardStore.getState().open({ type: "create" })}
              className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white
                        shadow-lg shadow-black/10 ring-1 ring-black/10
                        hover:bg-gray-800 active:scale-[0.99] transition"
            >
              글쓰기
            </button>
          </div>

          {/* 검색바 카드 */}
          <div className="mt-5 rounded-3xl bg-white p-4 shadow-lg shadow-black/5 ring-1 ring-black/5">
            <BoardSearchBar />
          </div>

          {/* 목록 카드 */}
          <div className="mt-4 rounded-3xl bg-white shadow-lg shadow-black/5 ring-1 ring-black/5 overflow-hidden">
            <BoardListPanel items={filtered} />
            <div className="border-t border-gray-100 px-4 py-3">
              <BoardPagination />
            </div>
          </div>
        </div>

        {/* 모달들 */}
        <BoardUpsertModal
          open={modal.type === "create" || modal.type === "edit"}
          mode={modal.type === "edit" ? "edit" : "create"}
          editId={modal.type === "edit" ? modal.id : undefined}
          onClose={close}
        />
        <BoardDetailModal open={modal.type === "detail"} id={modal.type === "detail" ? modal.id : ""} onClose={close} />
        <BoardDeleteModal open={modal.type === "delete"} id={modal.type === "delete" ? modal.id : ""} onClose={close} />
      </div>
    </>
  );
}
