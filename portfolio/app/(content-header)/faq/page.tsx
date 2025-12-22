// app/(content-header)/faq/page.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import usePublicFaqStore from "./store";
import FaqPublicSearchBar from "./components/FaqPublicSearchBar";
import FaqCategoryChips from "./components/FaqCategoryChips";
import FaqAccordionList from "./components/FaqAccordionList";

export default function FaqPage() {
  const { items, query, fetchFaqs, loading, error } = usePublicFaqStore();

  // 최초 1회 로드
  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // keyword/category 변경 시 재조회(디바운스)
  const tRef = useRef<any>(null);
  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      fetchFaqs();
    }, 300);

    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [query.keyword, query.category, fetchFaqs]);

  return (
    <div className="h-full overflow-hidden px-4">
      <div className="flex h-full min-h-0 flex-col gap-4">
        {/* Header */}
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
          <div>
            <div className="text-sm font-semibold">FAQ</div>
            <div className="mt-1 text-xs text-gray-500">
              자주 묻는 질문을 빠르게 확인하세요.
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <FaqPublicSearchBar />
            <FaqCategoryChips />
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl p-1">
          {error ? (
            <div className="rounded-2xl bg-white p-6 text-sm text-red-600 shadow-sm">
              {error}
            </div>
          ) : null}

          <FaqAccordionList items={items} />
        </div>

        {/* 페이지 바 */}
        <FaqPublicPaginationBar />
      </div>
    </div>
  );
}

/** 페이지바는 page.tsx 내부에 둬도 되고 components로 빼도 됨 */
function FaqPublicPaginationBar() {
  const { page, loading, hasMore, nextPage, prevPage, items } =
    usePublicFaqStore();

  // 목록이 비었으면 버튼 숨김(선택)
  if (!items?.length && page === 1) return null;

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          페이지 {page} {loading ? "(로딩중...)" : ""}
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-lg bg-white px-4 py-2 text-xs shadow-sm transition hover:shadow-md disabled:opacity-40"
            disabled={loading || page <= 1}
            onClick={prevPage}
          >
            이전
          </button>

          <button
            className="rounded-lg bg-black px-4 py-2 text-xs text-white shadow-sm transition hover:shadow-md disabled:opacity-40"
            disabled={loading || !hasMore}
            onClick={nextPage}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
