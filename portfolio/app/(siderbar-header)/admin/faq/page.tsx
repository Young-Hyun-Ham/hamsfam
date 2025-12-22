// app/(siderbar-header)/admin/faq/page.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import useAdminFaqStore from "./store";
import FaqListPanel from "./components/FaqListPanel";
import FaqDetailPanel from "./components/FaqDetailPanel";
import FaqUpsertModal from "./components/modal/FaqUpsertModal";
import FaqDeleteModal from "./components/modal/FaqDeleteModal";

export default function AdminFaqPage() {
  const { fetchFaqs, items, query, selectedId } = useAdminFaqStore();

  // 최초 1회
  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // query 변경 시 재조회 (간단 디바운스)
  const tRef = useRef<any>(null);
  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      fetchFaqs();
    }, 300);
    return () => clearTimeout(tRef.current);
  }, [query.keyword, query.category, query.status, fetchFaqs]);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  return (
    // <div className="h-[calc(100dvh-64px)] p-4">
    <div className="h-full p-4">
      <div className="grid h-full grid-cols-12 gap-4">
        {/* Left */}
        <div className="col-span-5 h-full rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <FaqListPanel items={items} selectedId={selectedId} />
        </div>

        {/* Right */}
        <div className="col-span-7 h-full rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <FaqDetailPanel selected={selected} />
        </div>
      </div>

      <FaqUpsertModal />
      <FaqDeleteModal />
    </div>
  );
}
