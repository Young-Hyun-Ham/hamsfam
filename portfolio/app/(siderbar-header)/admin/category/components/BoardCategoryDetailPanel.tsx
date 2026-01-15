// app/(sidebar-header)/admin/category/components/BoardCategoryDetailPanel.tsx
"use client";

import { useMemo } from "react";
import useAdminBoardCategoryStore from "../store";
import { toDateTimeString } from "@/lib/utils/utils";

export default function BoardCategoryDetailPanel() {
  const { items, selectedId, openEdit } = useAdminBoardCategoryStore();

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        좌측에서 카테고리를 선택하세요.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm font-semibold">카테고리 상세</div>
          <div className="mt-1 text-xs text-gray-500">
            이 카테고리로 게시판을 생성/연결합니다.
          </div>
        </div>

        <button
          className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm transition hover:shadow-md focus:outline-none"
          onClick={() => openEdit(selected.id)}
        >
          편집
        </button>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Body */}
      <div className="flex-1 overflow-auto p-5">
        <div className="space-y-4">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-inner">
            <div className="text-xs text-gray-500">이름</div>
            <div className="mt-1 text-sm font-semibold">{selected.name}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">slug</div>
              <div className="mt-1 font-mono text-sm">{selected.slug}</div>
              <div className="mt-2 text-[11px] text-gray-400">
                예: /board/{selected.slug}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">정렬(order)</div>
              <div className="mt-1 text-sm">{selected.order}</div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">상태</div>
              <div className="mt-1 text-sm">{selected.status}</div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">ID</div>
              <div className="mt-1 break-all font-mono text-xs text-gray-700">
                {selected.id}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500">설명</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {selected.description?.trim() ? selected.description : "-"}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            createdAt: {toDateTimeString(selected.createdAt ?? "-")} / updatedAt:{" "}
            {toDateTimeString(selected.updatedAt ?? "-")}
          </div>
        </div>
      </div>
    </div>
  );
}
