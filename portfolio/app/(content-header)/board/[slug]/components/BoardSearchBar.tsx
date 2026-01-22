// app/(content-header)/board/[slug]/components/BoardSearchBar.tsx
"use client";

import usePublicBoardStore from "../store";

export default function BoardSearchBar() {
  const { slug, query, setQuery, fetchPosts, loading } = usePublicBoardStore();

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

      <div className="flex w-full items-center gap-2 md:w-72">
        <input
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:shadow-md"
          placeholder="태그(정확히)"
          value={query.tag ?? ""}
          onChange={(e) => setQuery({ tag: e.target.value })}
        />
        <button
          type="button"
          onClick={() => fetchPosts(slug, { reset: true })}
          disabled={!slug || loading}
          className={[
            "shrink-0 rounded-2xl bg-gray-100 px-3 py-2.5 text-xs font-medium text-gray-700",
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
