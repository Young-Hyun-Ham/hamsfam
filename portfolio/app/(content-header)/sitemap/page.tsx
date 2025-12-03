// app/(sidebar-header)/admin/sitemap/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  SitemapTree,
  AdminTree,
  MenuItem,
} from "./components/SitemapTree";
import * as backendService from "./services/backendService";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? "firebase";

export default function AdminSitemapPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(true);

  useEffect(() => {
    const loadMenus = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await backendService.fetchMenuList(BACKEND, {});
        console.log("Fetched menus:", data)
        const list = (data.items ?? data) as MenuItem[];

        setItems(list);
      } catch (err: any) {
        console.error("Failed to load menus", err);
        setError("메뉴 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, []);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* 상단 타이틀 */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          사이트맵
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          현재 등록된 메뉴 구조를 한눈에 확인할 수 있습니다.
          <br />
          1레벨 메뉴는 카드로, Admin 하위 메뉴는 트리로 표시됩니다.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          사이트맵을 불러오는 중입니다…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 1) 메인 메뉴 카드 섹션 */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">
              메인 메뉴 (Level 1)
            </h2>
            <SitemapTree items={items} />
          </section>

          {/* 2) Admin 섹션 (토글) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                Admin 메뉴 구조
              </h2>
              <button
                type="button"
                onClick={() => setShowAdmin((v) => !v)}
                className="text-xs rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 hover:bg-gray-50"
              >
                {showAdmin ? "Admin 숨기기" : "Admin 펼치기"}
              </button>
            </div>

            {showAdmin && <AdminTree items={items} />}
          </section>
        </>
      )}
    </div>
  );
}
