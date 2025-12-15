"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import { RangeUnit, UserStats, UserSummary } from "./types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function AdminUserStatsPage() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [rangeUnit, setRangeUnit] = useState<RangeUnit>("day");

  const rangeLabelMap: Record<RangeUnit, string> = {
    day: "오늘 (00시 ~ 23시)",
    week: "이번 주 (월요일 ~ 일요일)",
    month: "이번 달 (1일 ~ 말일)",
    year: "올해 (1월 ~ 12월)",
  };

  // 검색 입력
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // 🔍 사용자 검색 - 디바운스
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setError(null);

        const res = await fetch(
          `/api/admin/firebase/user-stats?query=${encodeURIComponent(
            search.trim()
          )}`
        );
        if (!res.ok) {
          throw new Error("사용자 검색에 실패했습니다.");
        }
        const data = await res.json();
        setSearchResults(data.items ?? []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "검색 중 오류가 발생했습니다.");
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectUser = (u: UserSummary) => {
    setSelectedUser(u);
    setSearchResults([]);
    setSearch("");
  };

  // 선택된 사용자 변경 시 통계 조회
  useEffect(() => {
    if (!selectedUser) {
      setStats(null);
      return;
    }

    (async () => {
      try {
        setStatsLoading(true);
        setError(null);

        const res = await fetch(
          `/api/admin/firebase/user-stats/${encodeURIComponent(
            selectedUser.id,
          )}?range=${rangeUnit}`,
        );
        if (!res.ok) {
          throw new Error("사용자 통계 조회에 실패했습니다.");
        }
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "통계 조회 중 오류가 발생했습니다.");
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [selectedUser, rangeUnit]);

  // ----- Chart 데이터 매핑 -----
  const lineData = stats
    ? {
        labels: stats.daily.labels,
        datasets: [
          {
            label: "토큰 사용량",
            data: stats.daily.values,
            borderWidth: 2,
            tension: 0.3,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const lineOptions: any = {
    responsive: true,
    maintainAspectRatio: false, // 높이에 맞춰 가로가 줄어드는 것 방지
    layout: {
      padding: {
        left: 8,
        right: 8, // 필요하면 0으로
        top: 8,
        bottom: 8,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false, mode: "index" as const },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutData = stats
  ? {
      labels: ["챗봇 메뉴", "시나리오 빌더", "게시판"],
      datasets: [
        {
          data: [
            stats.sourceUsage.chatbot,
            stats.sourceUsage.builder,
            stats.sourceUsage.board,
          ],
          backgroundColor: [
            "#4F46E5", // chatbot - Indigo
            "#10B981", // builder - Emerald
            "#F59E0B", // board - Amber
          ],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    }
  : { labels: [], datasets: [] };

  const doughnutOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  const barData = stats
    ? {
        labels: stats.topScenarios.map((s) => s.name),
        datasets: [
          {
            label: "사용 토큰",
            data: stats.topScenarios.map((s) => s.tokens),
            borderWidth: 1,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const barOptions: any = {
    responsive: true,
    plugins: { legend: { display: false } },
    indexAxis: "y" as const,
    scales: {
      x: { beginAtZero: true },
    },
  };

  return (
    <div className="px-6 py-6 space-y-6">
      {/* 헤더 + 선택된 사용자 */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              사용자별 통계
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Firebase 토큰 로그 데이터를 기반으로, 선택한 사용자의 토큰 사용량과
              시나리오 실행 통계를 확인합니다.
            </p>
          </div>

          {selectedUser && (
            <div className="flex items-center gap-3 text-right">
              {selectedUser.avatar_url && (
                <img
                  src={selectedUser.avatar_url}
                  alt={selectedUser.name}
                  className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                />
              )}
              <div className="text-xs text-slate-600">
                <div className="font-medium">
                  {selectedUser.name || selectedUser.email}
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedUser.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 검색 인풋 + 드롭다운 */}
        <div className="relative max-w-xl">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="이름 또는 이메일로 사용자 검색 (Firebase users)"
            className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {searchLoading && (
            <div className="absolute right-3 top-2.5 text-[11px] text-slate-400">
              검색 중...
            </div>
          )}

          {searchResults.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {searchResults.map((u) => (
                <li
                  key={u.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs hover:bg-slate-50"
                  onClick={() => handleSelectUser(u)}
                >
                  {u.avatar_url && (
                    <img
                      src={u.avatar_url}
                      alt={u.name}
                      className="h-7 w-7 rounded-full border border-slate-200 object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">
                      {u.name || u.email}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {u.email}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {!selectedUser && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
          상단에서 사용자를 검색 후 선택하면, 해당 사용자의 통계가 이 영역에
          표시됩니다.
        </div>
      )}

      {selectedUser && statsLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-10 text-center text-sm text-slate-500">
          {selectedUser.name || selectedUser.email} 님의 통계를 불러오는
          중입니다...
        </div>
      )}

      {selectedUser && stats && !statsLoading && (
        <>
          {/* KPI 카드 */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                오늘 사용 토큰
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {stats.todayTokens.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                이번달 사용 토큰
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {stats.monthTokens.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                누적 사용 토큰
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {stats.totalTokens.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                평균 세션당 토큰
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {stats.avgTokensPerSession.toFixed(1)}
              </div>
            </div>
          </section>

          {/* 그래프 영역 */}
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    일별 토큰 사용량
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {rangeLabelMap[rangeUnit]} 기준 토큰 사용량입니다.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>단위: 토큰</span>
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={rangeUnit}
                    onChange={(e) => setRangeUnit(e.target.value as RangeUnit)}
                  >
                    <option value="day">일단위 (00-23시)</option>
                    <option value="week">주단위 (월-일)</option>
                    <option value="month">월단위 (1-말일)</option>
                    <option value="year">년단위 (1-12월)</option>
                  </select>
                </div>
              </div>

              <div className="h-64 w-full">
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                메뉴(소스)별 사용 비율
              </h2>
              <p className="mt-1 text-[11fpx] text-slate-500">
                source 필드(chatbot / builder / board)를 기준으로 한 토큰 사용 비율입니다.
              </p>
              <div className="mt-3 flex h-56 items-center justify-center">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
              {/* 직접 만든 legend */}
              <div className="mt-4 flex items-center gap-6 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#4F46E5" }}></span>
                  챗봇 메뉴
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#10B981" }}></span>
                  시나리오 빌더
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#F59E0B" }}></span>
                  게시판
                </div>
              </div>
            </div>
          </section>

          {/* 상위 시나리오 */}
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              상위 사용 시나리오
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              선택된 사용자가 Firebase에서 가장 많이 실행한 시나리오 Top N.
            </p>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      시나리오
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      실행 수
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      사용 토큰
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topScenarios.map((row) => (
                    <tr
                      key={row.name}
                      className="odd:bg-white even:bg-slate-50/40"
                    >
                      <td className="px-3 py-2 text-slate-800">
                        {row.name}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {row.runs.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {row.tokens.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
