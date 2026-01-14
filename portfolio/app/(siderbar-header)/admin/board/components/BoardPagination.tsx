// app/(sidebar-header)/admin/board/components/BoardPagination.tsx
"use client";

import { useMemo } from "react";
import { useAdminBoardStore } from "../store";

export default function BoardPagination() {
  const { page, size, total } = useAdminBoardStore((s) => s.paging);
  const setPage = useAdminBoardStore((s) => s.setPage);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-gray-600">
        {page} / {totalPages} 페이지
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(1)}
          disabled={page === 1}
          className="rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-black/5
                     disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          처음
        </button>
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-black/5
                     disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          이전
        </button>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-black/5
                     disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          다음
        </button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={page >= totalPages}
          className="rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-black/5
                     disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          끝
        </button>
      </div>
    </div>
  );
}
