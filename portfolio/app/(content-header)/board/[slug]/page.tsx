// app/(content-header)/board/[slug]/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import usePublicBoardStore, { selectFilteredPosts } from "./store";
import BoardListPanel from "./components/BoardListPanel";
import BoardDetailPanel from "./components/BoardDetailPanel";
import BoardUpsertModal from "./components/modal/BoardUpsertModal";
import BoardDeleteModal from "./components/modal/BoardDeleteModal";

export default function PublicBoardPage() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug ?? "").toString();

  const {
    items,
    selectedId,
    detailOpen,
    query,
    setSlug,
    fetchPosts,
    error,
    loading,
  } = usePublicBoardStore();

  useEffect(() => {
    if (!slug) return;
    setSlug(slug);

    // API 붙일 때:
    fetchPosts(slug);
  }, [slug, setSlug, fetchPosts]);

  const filtered = useMemo(() => selectFilteredPosts(items, query), [items, query]);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  return (
    <>
      {/* 부모 높이/오버플로우를 확정해서 body 스크롤로 튀는 걸 차단 */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-4">
        <div className="mb-2 flex items-center justify-between">
          {/*
          <div className="text-sm font-semibold">
            <span className="font-mono">{slug}</span>
          </div>
          */}
          <div className="text-xs text-gray-500">
            {loading ? "loading..." : error ? `error: ${error}` : ""}
          </div>
        </div>

        {/* flex 기반으로 width/slide 애니메이션 */}
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          {/* Left (List) */}
          <div
            className={[
              "min-h-0 min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300 ease-out",
              detailOpen ? "w-5/12" : "w-full",
            ].join(" ")}
          >
            <BoardListPanel items={filtered} selectedId={selectedId} />
          </div>

          {/* Right (Detail) - 슬라이드 + 페이드 */}
          <div
            className={[
              "h-full rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out min-h-0 min-w-0 overflow-hidden",
              detailOpen
                ? "w-7/12 translate-x-0 opacity-100"
                : "w-0 translate-x-6 opacity-0 pointer-events-none",
            ].join(" ")}
            aria-hidden={!detailOpen}
          >
            <BoardDetailPanel selected={selected} />
          </div>
        </div>
      </div>

      {/* 등록, 수정, 삭제 모달 팝업 */}
      <BoardUpsertModal />
      <BoardDeleteModal />
    </>
  );
}
