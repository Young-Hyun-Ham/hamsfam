// app/(sidebar-header)/admin/category/components/modal/BoardCategoryDeleteModal.tsx
"use client";

import { useMemo, useState } from "react";
import useAdminBoardCategoryStore from "../../store";

export default function BoardCategoryDeleteModal() {
  const { 
    items, 
    selectedId, 
    deleteOpen, 
    closeDelete, 
    deleteCategory,
  } = useAdminBoardCategoryStore();

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const [confirmText, setConfirmText] = useState("");

  if (!deleteOpen) return null;

  const canDelete = selected && confirmText === selected.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4">
          <div>
            <div className="text-sm font-semibold text-red-600">
              카테고리 영구 삭제
            </div>
            <div className="mt-1 text-xs text-gray-500">
              연결된 게시판/게시글이 있다면 영향을 줄 수 있습니다.
            </div>
          </div>

          <button
            className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm transition hover:shadow-md focus:outline-none"
            onClick={closeDelete}
          >
            닫기
          </button>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Body */}
        <div className="space-y-4 p-6">
          <div className="rounded-xl bg-gray-50 p-4 shadow-inner">
            <div className="text-xs text-gray-500">삭제 대상</div>
            <div className="mt-1 text-sm font-medium">
              {selected?.name ?? "(선택 없음)"}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Category ID:{" "}
              <span className="font-mono font-medium text-gray-700">
                {selected?.id ?? "-"}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-red-50 p-4 text-xs text-red-700">
            ⚠️ 이 카테고리는 즉시 삭제되며 복구할 수 없습니다.
            <br />
            계속하려면 <b>Category ID</b>를 아래에 정확히 입력하세요.
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Category ID 입력</div>
            <input
              className="w-full rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:shadow-md"
              placeholder={selected?.id ?? ""}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />

            {!canDelete && confirmText.length > 0 && (
              <div className="text-xs text-red-600">ID가 일치하지 않습니다.</div>
            )}
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm transition hover:shadow-md focus:outline-none"
            onClick={closeDelete}
          >
            취소
          </button>

          <button
            disabled={!canDelete}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium text-white transition shadow-sm",
              canDelete ? "bg-red-600 hover:shadow-md" : "cursor-not-allowed bg-gray-300",
            ].join(" ")}
            onClick={async () => {
              if (!selectedId || !canDelete) return;
              try {
                await deleteCategory(selectedId);
              } catch (e: any) {
                alert(e?.message ?? "삭제 실패");
              }
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
