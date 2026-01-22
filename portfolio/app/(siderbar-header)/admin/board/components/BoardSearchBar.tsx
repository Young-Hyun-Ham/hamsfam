// app/(sidebar-header)/admin/board/components/BoardSearchBar.tsx
"use client";

import { ChevronDown } from "lucide-react";
import { useAdminBoardStore } from "../store";
import { useState } from "react";

export default function BoardSearchBar() {
  const [loading, setLoading] = useState(false);
  const { 
    query,
    setQuery,
    paging, 
    fetchList
  } = useAdminBoardStore();

  const onSearch  = () => {
    setLoading(true);
    try {
      const searchData = { ...query, ...paging, };
      fetchList({ ...searchData });
    } catch(e) {

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
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

      <div className="w-full md:w-40">
        <div className="relative">
          <select
            value={query.slug}
            onChange={(e) => setQuery({ slug: e.target.value as any })}
            className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
          >
            <option value="all">전체</option>
            <option value="notice">공지</option>
            <option value="qna">QnA</option>
            <option value="general">일반</option>
          </select>

          {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>
      </div>

      <div className="w-full md:w-18">
        <button
          type="button"
          onClick={onSearch}
          // disabled={!slug || loading}
          className={[
            "w-full shrink-0 rounded-2xl bg-gray-100 px-3 py-2.5 text-xs font-medium text-gray-700",
            "shadow-sm ring-1 ring-black/5 transition hover:bg-gray-200 hover:shadow-md active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          ].join(" ")}
          title="목록조회"
        >
          {loading ? "로딩..." : "조회"}
        </button>
      </div>
    </div>
  );
}
