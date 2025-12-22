// app/(siderbar-header)/admin/faq/components/FaqSearchBar.tsx
"use client";

import useAdminFaqStore from "../store";
import { FAQ_CATEGORIES, FAQ_STATUSES } from "../types";

export default function FaqSearchBar() {
  const { query, setQuery } = useAdminFaqStore();

  return (
    <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
      {/* 검색 인풋 */}
      <div className="flex-1">
        <input
          className="
            w-full rounded-lg bg-white px-4 py-2.5 text-sm
            shadow-sm transition
            placeholder:text-gray-400
            focus:outline-none focus:shadow-md
          "
          placeholder="검색 (질문 / 답변 / 태그)"
          value={query.keyword ?? ""}
          onChange={(e) => setQuery({ keyword: e.target.value })}
        />
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        <select
          className="
            rounded-lg bg-white px-4 py-2.5 text-sm
            shadow-sm transition
            focus:outline-none focus:shadow-md
          "
          value={query.category ?? "all"}
          onChange={(e) => setQuery({ category: e.target.value as any })}
        >
          <option value="all">전체 카테고리</option>
          {FAQ_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          className="
            rounded-lg bg-white px-4 py-2.5 text-sm
            shadow-sm transition
            focus:outline-none focus:shadow-md
          "
          value={query.status ?? "all"}
          onChange={(e) => setQuery({ status: e.target.value as any })}
        >
          <option value="all">전체 상태</option>
          {FAQ_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
