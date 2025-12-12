// app/(siderbar-header)/admin/stats/page.tsx
"use client";

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

// Chart.js 모듈 등록
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

const dummyLabels = ["월", "화", "수", "목", "금", "토", "일"];

// 예시 1: 일별 토큰 사용량 (Line)
const lineData = {
  labels: dummyLabels,
  datasets: [
    {
      label: "일별 사용 토큰",
      data: [1200, 980, 1350, 1600, 2100, 1800, 1500],
      borderWidth: 2,
      tension: 0.3,
    },
  ],
};

const lineOptions: any = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { intersect: false, mode: "index" as const },
  },
  scales: {
    x: {
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { stepSize: 500 },
    },
  },
};

// 예시 2: 상위 사용자별 사용량 (Bar)
const barData = {
  labels: ["user A", "user B", "user C", "user D"],
  datasets: [
    {
      label: "사용 토큰",
      data: [5200, 4100, 3900, 2600],
      borderWidth: 1,
    },
  ],
};

const barOptions: any = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  indexAxis: "y" as const,
  scales: {
    x: {
      beginAtZero: true,
    },
  },
};

// 예시 3: 백엔드별 사용 비율 (Doughnut)
const doughnutData = {
  labels: ["PostgreSQL", "Firebase"],
  datasets: [
    {
      data: [65, 35],
      borderWidth: 1,
    },
  ],
};

const doughnutOptions: any = {
  responsive: true,
  plugins: {
    legend: {
      position: "bottom" as const,
    },
  },
};

export default function AdminStatsPage() {
  return (
    <div className="px-6 py-6 space-y-6">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            통계 대시보드
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            토큰 사용량 / 사용자 활동 / 백엔드별 사용 비율을 한눈에 확인합니다.
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <div>기준 시각: 2025-12-11 19:00</div>
          <div>※ 현재는 더미 데이터입니다.</div>
        </div>
      </header>

      {/* KPIs 카드 영역 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 오늘 사용 토큰 */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">
            오늘 사용 토큰
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            12,340
          </div>
          <div className="mt-1 text-[11px] text-emerald-600">
            ▲ 어제보다 18% 증가
          </div>
        </div>

        {/* 이번달 누적 토큰 */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">
            이번달 누적 토큰
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            256,890
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            지난달: 198,320 토큰
          </div>
        </div>

        {/* 전체 사용자 수 */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">
            전체 사용자 수
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            142
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            활성 사용자(7일): 38명
          </div>
        </div>

        {/* 평균 세션 길이 */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">
            평균 세션 메시지 수
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            9.3
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            긴 세션(20+ 메시지): 12개
          </div>
        </div>
      </section>

      {/* 메인 그래프 영역 */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* 일별 토큰 사용량 (라인 차트) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                일별 토큰 사용량
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                최근 7일 기준. 스파이크 구간을 위주로 확인하세요.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">단위: 토큰</div>
          </div>
          <div className="h-64">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* 백엔드별 비율 (도넛 차트) */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            백엔드별 사용 비율
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            NEXT_PUBLIC_BACKEND 기준 실제 비율과 맞춰 나중에 교체 예정.
          </p>
          <div className="mt-3 h-56 flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
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
            가장 많이 사용하는 계정을 빠르게 파악할 수 있습니다.
          </p>
          <div className="mt-3 h-56">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* 상위 시나리오 리스트 (표 형태 퍼블리싱) */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            상위 시나리오 사용 통계
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            React-Flow 시나리오 중 호출이 많은 Top 5.
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
                {[
                  { name: "회원가입 플로우", runs: 120, tokens: 32000 },
                  { name: "FAQ 답변봇", runs: 98, tokens: 21000 },
                  { name: "주문 조회", runs: 75, tokens: 18500 },
                  { name: "장바구니 도우미", runs: 54, tokens: 14200 },
                  { name: "고객센터 연결", runs: 33, tokens: 8900 },
                ].map((row) => (
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
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[11px] text-slate-400">
            ※ 이 영역은 나중에 PostgreSQL 통계 API 연동해서 실제 데이터로 교체.
          </div>
        </div>
      </section>
    </div>
  );
}
