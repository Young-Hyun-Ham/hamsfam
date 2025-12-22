"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { api } from "@/lib/axios";
import { StatsRange, StatsResponse } from "./types";

// Chart.js 모듈 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

function n(v: number) {
  return Number(v ?? 0).toLocaleString();
}

function formatKST(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function thisYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function AdminStatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<StatsRange>("recent7");
  const [modalOpen, setModalOpen] = useState(false);

  // anchor는 range별 포맷
  // - day/week: YYYY-MM-DD
  // - month: YYYY-MM
  const [anchor, setAnchor] = useState<string>("");

  // 모달에서 입력 중인 값(적용 누르기 전까지 실제 anchor 반영 안함)
  const [draftAnchor, setDraftAnchor] = useState<string>("");

  // range/anchor로 통계 조회
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();
        qs.set("range", range);
        if (anchor) qs.set("anchor", anchor);

        const res = await api.get<StatsResponse>(
          `/api/admin/firebase/stats?${qs.toString()}`,
        );
        if (!res.data?.ok) throw new Error("통계 조회에 실패했습니다.");
        setData(res.data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "통계 조회 중 오류가 발생했습니다.");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [range, anchor]);

  // ----- Line -----
  const lineData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: data.line.labels,
      datasets: [
        {
          label: "토큰 사용량",
          data: data.line.values,
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    };
  }, [data]);

  const lineOptions: any = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { intersect: false, mode: "index" as const },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
      },
    }),
    [],
  );

  // ----- Doughnut (메뉴/소스별 비율) -----
  const doughnutData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: ["챗봇 메뉴", "시나리오 빌더", "게시판"],
      datasets: [
        {
          data: [
            data.sourceUsage.chatbot,
            data.sourceUsage.builder,
            data.sourceUsage.board,
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const doughnutOptions: any = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          display: false, // ✅ 기본 범례 숨김
        },
      },
    }),
    [],
  );

  // ----- Bar (상위 사용자) -----
  const barData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };

    const labels = data.topUsers.map((u) => u.name || u.email || u.id);
    const values = data.topUsers.map((u) => u.tokens);

    return {
      labels,
      datasets: [
        {
          label: "사용 토큰",
          data: values,
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const barOptions: any = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { display: false } },
      indexAxis: "y" as const,
      scales: { x: { beginAtZero: true } },
    }),
    [],
  );

  const headerRight = useMemo(() => {
    if (!data) {
      return (
        <div className="text-right text-[11px] text-slate-400">
          <div>기준 시각: -</div>
          <div>※ 데이터 로딩 전</div>
        </div>
      );
    }
    return (
      <div className="text-right text-[11px] text-slate-400">
        <div>기준 시각: {formatKST(data.기준시각)}</div>
        <div>※ Firebase used 로그 기반</div>
      </div>
    );
  }, [data]);

  const rangeLabel = useMemo(() => {
    if (range === "recent7") return "기본(최근 7일)";
    if (range === "day") return "일단위";
    if (range === "week") return "주단위";
    return "월단위";
  }, [range]);

  const handleChangeRange = (next: StatsRange) => {
    if (next === "recent7") {
      // 기본은 즉시 반영
      setRange("recent7");
      setAnchor("");
      return;
    }

    // day/week/month 는 모달에서 anchor 선택 후 적용
    setRange(next);

    // 기본값 세팅
    if (next === "month") setDraftAnchor(thisYYYYMM());
    else setDraftAnchor(todayYYYYMMDD());

    setModalOpen(true);
  };

  const modalTitle = useMemo(() => {
    if (range === "day") return "일단위 조회";
    if (range === "week") return "주단위 조회";
    return "월단위 조회";
  }, [range]);

  const modalDesc = useMemo(() => {
    if (range === "day")
      return "날짜를 선택하면 해당 날짜(00~23시) 기준으로 통계가 조회됩니다.";
    if (range === "week")
      return "날짜를 선택하면 해당 날짜가 속한 주(월~일) 기준으로 통계가 조회됩니다.";
    return "월을 선택하면 해당 월(1일~말일) 기준으로 통계가 조회됩니다.";
  }, [range]);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">통계 대시보드</h1>
          <p className="mt-1 text-xs text-slate-500">
            토큰 사용량 / 사용자 활동 / 메뉴(소스)별 사용 비율을 한눈에 확인합니다.
          </p>
        </div>
        {headerRight}
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-10 text-center text-sm text-slate-500">
          통계 데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPIs 카드 영역 */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                오늘 사용 토큰
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {n(data.kpi.todayTokens)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                범위: {rangeLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                이번달 누적 토큰
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {n(data.kpi.monthTokens)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                (API 스펙 기준)
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                전체 사용자 수
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {n(data.kpi.totalUsers)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                활성 사용자(선택 범위): {n(data.kpi.activeUsers)}명
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">
                평균 세션당 토큰
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {data.kpi.avgTokensPerSession.toFixed(1)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                선택 범위 기준
              </div>
            </div>
          </section>

          {/* 메인 그래프 영역 */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* 일별 토큰 사용량 */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    일별 토큰 사용량
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    범위를 변경하면 아래 모든 통계가 함께 변경됩니다.
                  </p>
                </div>

                {/* 우측 끝 select */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>단위: 토큰</span>
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={range}
                    onChange={(e) => handleChangeRange(e.target.value as StatsRange)}
                  >
                    <option value="recent7">기본(최근 7일)</option>
                    <option value="day">일단위</option>
                    <option value="week">주단위</option>
                    <option value="month">월단위</option>
                  </select>
                </div>
              </div>

              <div className="h-64">
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>

            {/* 메뉴(소스)별 사용 비율 */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                메뉴(소스)별 사용 비율
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                source 필드(chatbot / builder / board)를 기준으로 한 토큰 사용 비율입니다.
              </p>

              <div className="mt-3 flex h-56 items-center justify-center">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
                  <div className="text-slate-400">챗봇</div>
                  <div className="font-medium">{n(data.sourceUsage.chatbot)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
                  <div className="text-slate-400">빌더</div>
                  <div className="font-medium">{n(data.sourceUsage.builder)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
                  <div className="text-slate-400">게시판</div>
                  <div className="font-medium">{n(data.sourceUsage.board)}</div>
                </div>
              </div>

              {/* 직접 만든 legend */}
              <div className="mt-3 flex items-center gap-6 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-indigo-600" />
                  챗봇 메뉴
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
                  시나리오 빌더
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                  게시판
                </div>
              </div>
            </div>
          </section>

          {/* 하단: 상위 사용자/시나리오 */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* 상위 사용자별 사용량 */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                상위 사용자별 토큰 사용량
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                선택 범위 기준 Top 10.
              </p>

              <div className="mt-3 h-56">
                <Bar data={barData} options={barOptions} />
              </div>

              <div className="mt-4 space-y-2">
                {data.topUsers.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.name}
                          className="h-6 w-6 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full border border-slate-200 bg-slate-100" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-800">
                          {u.name || u.email || u.id}
                        </div>
                        <div className="truncate text-[11px] text-slate-400">{u.email}</div>
                      </div>
                    </div>
                    <div className="font-semibold text-slate-800">{n(u.tokens)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 상위 시나리오 리스트 */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">상위 시나리오 사용 통계</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                선택 범위 기준 usageType Top 5.
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">시나리오</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">실행 수</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">사용 토큰</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topScenarios.map((row) => (
                      <tr key={row.name} className="odd:bg-white even:bg-slate-50/40">
                        <td className="px-3 py-2 text-slate-800">{row.name}</td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {row.runs.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {row.tokens.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {data.topScenarios.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-xs text-slate-400">
                          표시할 시나리오 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                ※ used 로그 구조(usageType/sessionId/source)가 바뀌면 집계 기준도 같이 조정하세요.
              </div>
            </div>
          </section>
        </>
      )}

      {!loading && !data && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
          통계 데이터가 없습니다.
        </div>
      )}

      {/* Range 선택 모달 */}
      {modalOpen && range !== "recent7" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{modalTitle}</div>
                <div className="mt-1 text-xs text-slate-500">{modalDesc}</div>
              </div>
              <button
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                onClick={() => setModalOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {range === "month" ? (
                <input
                  type="month"
                  value={draftAnchor}
                  onChange={(e) => setDraftAnchor(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              ) : (
                <input
                  type="date"
                  value={draftAnchor}
                  onChange={(e) => setDraftAnchor(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              )}

              {range === "week" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  선택한 날짜가 속한 주의 <b>월요일~일요일</b> 범위로 자동 집계됩니다.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setModalOpen(false);
                  }}
                >
                  취소
                </button>

                <button
                  className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={!draftAnchor}
                  onClick={() => {
                    setAnchor(draftAnchor);
                    setModalOpen(false);
                  }}
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
