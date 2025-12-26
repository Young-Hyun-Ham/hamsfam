// app/(sidebar-header)/admin/category/page.tsx
"use client";

import { useEffect } from "react";
import useAdminBoardCategoryStore from "./store";

import BoardCategoryListPanel from "./components/BoardCategoryListPanel";
import BoardCategoryDetailPanel from "./components/BoardCategoryDetailPanel";
import BoardCategoryUpsertModal from "./components/modal/BoardCategoryUpsertModal";
import BoardCategoryDeleteModal from "./components/modal/BoardCategoryDeleteModal";

export default function AdminCategoryPage() {
  const { fetchCategories } = useAdminBoardCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="h-[calc(100dvh-64px)] p-4">
      <div className="grid h-full grid-cols-12 gap-4">
        <div className="col-span-5 h-full overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
          <BoardCategoryListPanel />
        </div>

        <div className="col-span-7 h-full overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
          <BoardCategoryDetailPanel />
        </div>
      </div>

      <BoardCategoryUpsertModal />
      <BoardCategoryDeleteModal />
    </div>
  );
}
