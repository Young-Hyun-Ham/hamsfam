"use client";

import usePublicFaqStore from "../store";

export default function FaqPublicSearchBar() {
  const { query, setQuery } = usePublicFaqStore();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <input
          className="
            w-full rounded-xl bg-white px-4 py-3 text-sm
            shadow-sm transition placeholder:text-gray-400
            focus:outline-none focus:shadow-md
          "
          placeholder="검색 (질문 / 답변 / 태그)"
          value={query.keyword ?? ""}
          onChange={(e) => setQuery({ keyword: e.target.value })}
        />
      </div>
    </div>
  );
}
