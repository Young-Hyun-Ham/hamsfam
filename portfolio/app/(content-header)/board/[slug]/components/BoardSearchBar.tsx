// app/(content-header)/board/[slug]/components/BoardSearchBar.tsx
"use client";

import usePublicBoardStore from "../store";

export default function BoardSearchBar() {
  const { query, setQuery } = usePublicBoardStore();

  return (
    <div className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
      <div className="flex-1">
        <input
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:shadow-md"
          placeholder="검색 (제목 / 내용 / 태그)"
          value={query.keyword ?? ""}
          onChange={(e) => setQuery({ keyword: e.target.value })}
        />
      </div>

      <div className="w-full md:w-56">
        <input
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:shadow-md"
          placeholder="태그(정확히)"
          value={query.tag ?? ""}
          onChange={(e) => setQuery({ tag: e.target.value })}
        />
      </div>
    </div>
  );
}
