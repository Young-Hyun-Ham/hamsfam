// app/(sidebar-header)/admin/user-info/page.tsx
"use client";

import { useMemo, useState } from "react";

type UserRow = {
  uid: string;
  name: string;
  email: string;
  provider: "google" | "firebase" | "custom" | string;
  roles: string[];
  backend: "firebase" | "postgres";
  createdAt: string;
  lastLoginAt: string;
};

// 퍼블리싱용 더미 데이터 (나중에 API 연동으로 교체)
const MOCK_USERS: UserRow[] = [
  {
    uid: "tZRfYhhEaqUGvDfXYo6639K2wlP2",
    name: "함영현",
    email: "sodlfmagka1@gmail.com",
    provider: "google",
    roles: ["admin"],
    backend: "firebase",
    createdAt: "2025-08-26 15:40:03",
    lastLoginAt: "2025-12-03 14:21:11",
  },
  {
    uid: "local:0001",
    name: "테스트 사용자",
    email: "test@example.com",
    provider: "custom",
    roles: ["user"],
    backend: "postgres",
    createdAt: "2025-08-30 10:12:00",
    lastLoginAt: "2025-09-01 09:00:00",
  },
];

const providerLabel: Record<string, string> = {
  google: "Google",
  firebase: "Firebase",
  custom: "Custom",
};

export default function AdminUserInfoPage() {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [backendFilter, setBackendFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return MOCK_USERS.filter((u) => {
      if (
        providerFilter !== "all" &&
        u.provider !== providerFilter
      ) {
        return false;
      }
      if (
        backendFilter !== "all" &&
        u.backend !== backendFilter
      ) {
        return false;
      }
      if (!search.trim()) return true;

      const keyword = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword) ||
        u.uid.toLowerCase().includes(keyword)
      );
    });
  }, [search, providerFilter, backendFilter]);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* 헤더 영역 */}
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-gray-900">
          사용자 정보
        </h1>
        <p className="text-sm text-gray-500">
          Firebase OAuth / Postgres에 저장된 사용자 정보를 한눈에
          확인할 수 있는 화면입니다.
          <br />
          현재는 퍼블리싱용 예시 데이터이며, 나중에 API 연동으로
          교체하면 됩니다.
        </p>
      </header>

      {/* 필터 / 검색 바 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Provider 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">
              Provider
            </span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="google">Google</option>
              <option value="firebase">Firebase</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Backend 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">
              Backend
            </span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700"
              value={backendFilter}
              onChange={(e) => setBackendFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="firebase">Firebase</option>
              <option value="postgres">Postgres</option>
            </select>
          </div>

          {/* 검색 */}
          <div className="flex-1 min-w-[160px] flex items-center gap-2 justify-end">
            <div className="relative w-full max-w-xs">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-8 pr-3 text-xs text-gray-800 placeholder:text-gray-400"
                placeholder="이름 / 이메일 / UID 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                🔍
              </span>
            </div>
            <button
              type="button"
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-xs text-gray-600 hover:bg-gray-50"
              onClick={() => {
                setSearch("");
                setProviderFilter("all");
                setBackendFilter("all");
              }}
            >
              초기화
            </button>
          </div>
        </div>
      </section>

      {/* 테이블 섹션 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {/* 상단 요약 */}
        <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
          <div>
            총{" "}
            <span className="font-semibold text-gray-800">
              {filtered.length}
            </span>{" "}
            명
          </div>
          <div className="flex gap-3">
            <span>
              Firebase:{" "}
              {
                filtered.filter((u) => u.backend === "firebase")
                  .length
              }{" "}
              명
            </span>
            <span>
              Postgres:{" "}
              {
                filtered.filter((u) => u.backend === "postgres")
                  .length
              }{" "}
              명
            </span>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                <th className="px-3 py-2 text-left font-medium">
                  #
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  이름
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  이메일
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Provider
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Roles
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Backend
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  가입일
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  마지막 로그인
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  UID
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-xs text-gray-400"
                  >
                    조건에 해당하는 사용자가 없습니다.
                  </td>
                </tr>
              )}

              {filtered.map((u, idx) => (
                <tr
                  key={u.uid}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {u.name || "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {u.email}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                      {providerLabel[u.provider] ?? u.provider}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {u.roles?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                      {u.backend}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {u.createdAt}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {u.lastLoginAt}
                  </td>
                  <td className="px-3 py-2 text-gray-400 max-w-[200px] truncate">
                    {u.uid}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 하단 페이징 자리 (지금은 퍼블리싱만) */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
          <span>1 / 1 페이지</span>
          <div className="flex gap-1">
            <button className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50">
              처음
            </button>
            <button className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50">
              이전
            </button>
            <button className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50">
              다음
            </button>
            <button className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50">
              마지막
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
