// app/(sidebar-header)/admin/board/components/modal/BoardDeleteModal.tsx
"use client";

import { useMemo, useState } from "react";
import { useAdminBoardStore } from "../../store";

type Props = {
  open: boolean;
  id: string;
  onClose: () => void;
};

export default function BoardDeleteModal({ open, id, onClose }: Props) {
  const getById = useAdminBoardStore((s) => s.getById);
  const del = useAdminBoardStore((s) => s.deleteRow);

  const row = useMemo(() => (open && id ? getById(id) : undefined), [open, id, getById]);
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const can = row ? typed.trim() === row.id.trim() : false;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl shadow-black/20 ring-1 ring-black/10 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="text-lg font-semibold text-gray-900">삭제 확인</div>
          <div className="mt-1 text-xs text-gray-500">ID를 입력해야 삭제됩니다.</div>
        </div>

        <div className="px-6 py-5">
          {!row ? (
            <div className="rounded-3xl bg-gray-50 p-10 text-center text-sm text-gray-500 ring-1 ring-black/5">
              데이터를 찾을 수 없습니다.
            </div>
          ) : (
            <>
              <div className="rounded-3xl bg-gray-50 p-4 ring-1 ring-black/5">
                <div className="text-xs text-gray-500">삭제 대상</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{row.title}</div>
                <div className="mt-1 text-xs text-gray-600">ID: {row.id}</div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-gray-700">삭제하려면 아래에 ID를 입력하세요</label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                             focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100"
                  placeholder={row.id}
                />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:bg-gray-50">
              취소
            </button>
            <button
              disabled={!can}
              onClick={() => {
                if (!row) return;
                del(row.id);
                onClose();
              }}
              className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white
                         shadow-lg shadow-rose-600/20 ring-1 ring-rose-700/30 hover:bg-rose-700
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
