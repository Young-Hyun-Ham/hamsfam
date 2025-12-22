"use client";

import useAdminFaqStore from "../store";
import type { AdminFaq } from "../types";

export default function FaqDetailPanel({ selected }: { selected: AdminFaq | null }) {
  const { openEdit } = useAdminFaqStore();

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        좌측에서 FAQ를 선택하세요.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="text-sm font-semibold">상세</div>
        <button
          className="rounded-md border px-3 py-2 text-xs"
          onClick={() => openEdit(selected.id)}
        >
          편집
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500">Question</div>
            <div className="mt-1 rounded-lg bg-gray-50 p-4 text-sm shadow-inner">
              {selected.question}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Answer</div>
            <div className="mt-1 whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-sm">
              {selected.answer}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
              <div className="text-xs text-gray-500">Category</div>
              <div className="mt-1 text-sm">{selected.category}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
              <div className="text-xs text-gray-500">Status</div>
              <div className="mt-1 text-sm">{selected.status}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
              <div className="text-xs text-gray-500">Order</div>
              <div className="mt-1 text-sm">{selected.order}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
              <div className="text-xs text-gray-500">Tags</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {selected.tags.length ? (
                  selected.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-gray-100 px-2 py-0.5 text-[11px]"
                    >
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            createdAt: {selected.createdAt ?? "-"} / updatedAt:{" "}
            {selected.updatedAt ?? "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
