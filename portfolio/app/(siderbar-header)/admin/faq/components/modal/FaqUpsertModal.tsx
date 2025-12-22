// app/(siderbar-header)/admin/faq/components/modal/FaqUpsertModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useAdminFaqStore from "../../store";
import { FAQ_CATEGORIES, FAQ_STATUSES, type AdminFaq, type FaqCategory, type FaqStatus } from "../../types";

const empty = (): Omit<AdminFaq, "id"> => ({
  category: "general",
  question: "",
  answer: "",
  status: "draft",
  order: 1,
  tags: [],
  createdAt: undefined,
  updatedAt: undefined,
});

export default function FaqUpsertModal() {
  const {
    items,
    selectedId,
    upsertOpen,
    closeUpsert,
    createFaq,
    updateFaq,
  } = useAdminFaqStore();

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const isEdit = !!selected;

  const [form, setForm] = useState<Omit<AdminFaq, "id">>(empty());
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    if (!upsertOpen) return;
    if (selected) {
      const { id: _id, ...rest } = selected;
      setForm(rest);
      setTagsText((selected.tags ?? []).join(", "));
    } else {
      setForm(empty());
      setTagsText("");
    }
  }, [upsertOpen, selected]);

  if (!upsertOpen) return null;

  const onSave = () => {
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!form.question.trim()) return alert("질문을 입력하세요.");
    if (!form.answer.trim()) return alert("답변을 입력하세요.");

    if (isEdit && selectedId) {
      updateFaq(selectedId, { ...form, tags });
    } else {
      createFaq({ ...form, tags });
    }
  };

  // ✅ 공통 인풋/셀렉트 스타일 (shadow 기반)
  const control =
    "w-full rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition " +
    "placeholder:text-gray-400 focus:outline-none focus:shadow-md";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-sm font-semibold">
            {isEdit ? "FAQ 수정" : "FAQ 등록"}
          </div>

          <button
            className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm transition hover:shadow-md focus:outline-none"
            onClick={closeUpsert}
          >
            닫기
          </button>
        </div>

        {/* soft divider */}
        <div className="h-px bg-gray-100" />

        {/* Body */}
        <div className="space-y-4 p-6">
          {/* 상단 2개: 카테고리/상태 */}
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-2">
              <div className="text-xs text-gray-500">카테고리</div>
              <select
                className={control}
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    category: e.target.value as FaqCategory,
                  }))
                }
              >
                {FAQ_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-xs text-gray-500">상태</div>
              <select
                className={control}
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value as FaqStatus }))
                }
              >
                {FAQ_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 질문 */}
          <div className="gap-4">
            <label className="space-y-2">
              <div className="text-xs text-gray-500">질문</div>
              <input
                className={control}
                value={form.question}
                onChange={(e) =>
                  setForm((p) => ({ ...p, question: e.target.value }))
                }
              />
            </label>
          </div>

          {/* 답변 */}
          <div className="gap-4">
            <label className="space-y-2">
              <div className="text-xs text-gray-500">답변</div>
              <textarea
                className={[
                  control,
                  "h-44 resize-none leading-6",
                ].join(" ")}
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
              />
            </label>
          </div>

          {/* 하단 2개: order/tags */}
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
              <div className="text-xs text-gray-500">태그(콤마 구분)</div>
              <input
                className={control}
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="예: token, billing"
              />
            </label>
          </div>
        </div>

        {/* soft divider */}
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
