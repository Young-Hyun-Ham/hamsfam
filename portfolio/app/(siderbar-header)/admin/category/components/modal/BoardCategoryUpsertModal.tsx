// app/(sidebar-header)/admin/category/components/modal/BoardCategoryUpsertModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useAdminBoardCategoryStore from "../../store";
import type { AdminBoardCategory, BoardCategoryStatus } from "../../types";

const empty = (): Omit<AdminBoardCategory, "id"> => ({
  name: "",
  slug: "",
  description: "",
  order: 1,
  status: "active",
  createdAt: undefined,
  updatedAt: undefined,
});

export default function BoardCategoryUpsertModal() {
  const { 
    items, 
    selectedId, 
    upsertOpen, 
    closeUpsert, 
    createCategory, 
    updateCategory
  } = useAdminBoardCategoryStore();

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const isEdit = !!selected;

  const [form, setForm] = useState<Omit<AdminBoardCategory, "id">>(empty());

  useEffect(() => {
    if (!upsertOpen) return;
    if (selected) {
      const { id: _id, ...rest } = selected;
      setForm(rest);
    } else {
      setForm(empty());
    }
  }, [upsertOpen, selected]);

  if (!upsertOpen) return null;

  const control =
    "w-full rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition " +
    "placeholder:text-gray-400 focus:outline-none focus:shadow-md";

  const onSave = async () => {
    if (!form.name.trim()) return alert("카테고리 이름을 입력하세요.");
    if (!form.slug.trim()) return alert("slug를 입력하세요. (예: notice)");

    try {
      if (isEdit && selectedId) await updateCategory(selectedId, form);
      else await createCategory(form);
    } catch (e: any) {
      alert(e?.message ?? "저장 실패");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-sm font-semibold">
            {isEdit ? "카테고리 수정" : "카테고리 등록"}
          </div>

          <button
            className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm transition hover:shadow-md focus:outline-none"
            onClick={closeUpsert}
          >
            닫기
          </button>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Body */}
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-2">
              <div className="text-xs text-gray-500">이름</div>
              <input
                className={control}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="예: 공지사항"
              />
            </label>

            <label className="space-y-2">
              <div className="text-xs text-gray-500">slug (URL 키)</div>
              <input
                className={control}
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="예: notice"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-2">
              <div className="text-xs text-gray-500">정렬(order)</div>
              <input
                type="number"
                className={control}
                value={form.order}
                onChange={(e) =>
                  setForm((p) => ({ ...p, order: Number(e.target.value || 0) }))
                }
              />
            </label>

            <label className="space-y-2">
              <div className="text-xs text-gray-500">상태</div>
              <select
                className={control}
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value as BoardCategoryStatus }))
                }
              >
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <div className="text-xs text-gray-500">설명</div>
            <textarea
              className={[control, "h-36 resize-none leading-6"].join(" ")}
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="카테고리 설명을 입력하세요."
            />
          </label>

          <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-600 shadow-inner">
            💡 slug는 게시판 주소에 사용됩니다. 예) <b>/board/notice</b>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm transition hover:shadow-md focus:outline-none"
            onClick={closeUpsert}
          >
            취소
          </button>

          <button
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md focus:outline-none"
            onClick={onSave}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
