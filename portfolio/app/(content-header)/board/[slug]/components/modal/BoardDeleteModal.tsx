// app/(content-header)/board/[slug]/components/modal/BoardDeleteModal.tsx
"use client";

import { useMemo, useState } from "react";
import usePublicBoardStore from "../../store";

export default function BoardDeleteModal() {
  const { deleteOpen, closeDelete, deletePost, selectedId, items, saving } =
    usePublicBoardStore() as any;

  const selected = useMemo(
    () => items.find((it: any) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const [confirmText, setConfirmText] = useState("");

  if (!deleteOpen || !selectedId) return null;

  const canDelete = confirmText.trim() === "삭제";

  async function confirm() {
    if (!canDelete) return;
    await deletePost(selectedId);
    closeDelete();
    setConfirmText("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeDelete();
          setConfirmText("");
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)] ring-1 ring-black/5">
          <div className="flex items-start justify-between px-6 pb-4 pt-5">
            <div>
              <div className="text-base font-semibold text-red-600">게시글 삭제</div>
              <div className="mt-1 text-xs text-gray-500">
                삭제하면 복구할 수 없습니다. 아래에 <b>삭제</b>를 입력하세요.
              </div>
            </div>

            <button
              onClick={() => {
                closeDelete();
                setConfirmText("");
              }}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:bg-gray-200"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-6 pb-6">
            <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
              <div className="text-sm font-medium text-red-700">
                {selected?.title ?? "선택된 게시글"}
              </div>
              <div className="mt-1 text-xs text-red-600/80">
                이 작업은 되돌릴 수 없습니다.
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 text-xs font-medium text-gray-600">확인 문구</div>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='삭제하려면 "삭제" 를 입력'
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-black/5 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-black/10"
                disabled={Boolean(saving)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 pb-6">
            <button
              onClick={() => {
                closeDelete();
                setConfirmText("");
              }}
              disabled={Boolean(saving)}
              className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              onClick={confirm}
              disabled={!canDelete || Boolean(saving)}
              className="rounded-2xl bg-red-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
