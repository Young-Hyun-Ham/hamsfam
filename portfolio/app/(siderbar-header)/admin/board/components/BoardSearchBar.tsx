// app/(sidebar-header)/admin/board/components/BoardSearchBar.tsx
"use client";

import { useAdminBoardStore } from "../store";

export default function BoardSearchBar() {
  const query = useAdminBoardStore((s) => s.query);
  const setQuery = useAdminBoardStore((s) => s.setQuery);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="flex-1">
        <input
          value={query.keyword}
          onChange={(e) => setQuery({ keyword: e.target.value })}
          placeholder="검색 (제목 / 내용 / 태그)"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm
                     shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div className="w-full md:w-56">
        <input
          value={query.tag}
          onChange={(e) => setQuery({ tag: e.target.value })}
          placeholder="태그(정확히)"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm
                     shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div className="w-full md:w-44">
        <select
          value={query.slug}
          onChange={(e) => setQuery({ slug: e.target.value as any })}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm
                     shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          <option value="all">전체</option>
          <option value="notice">공지</option>
          <option value="qna">QnA</option>
          <option value="general">일반</option>
        </select>
      </div>
    </div>
  );
}
