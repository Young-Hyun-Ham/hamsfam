<!-- src/routes/stocks/+page.svelte -->
<script lang="ts">
  import { holdings, type Holding } from "$lib/stores/holdings";
  import PriceChart from "$lib/components/PriceChart.svelte";
  import { get } from "svelte/store";
  import type { PricePoint } from "$lib/types";

  type StockOption = { code: string; name: string };

  // 검색 조건
  let baseDate = toYmd(new Date()); // 기본: 오늘
  let selectedCode = "ALL";         // 기본: 전체

  // 조회 결과(퍼블리싱용 상태)
  let loading = false;
  let errorMsg = "";

  // 단일 종목 상세(차트/요약용)
  let series: PricePoint[] = [];
  let baseClose: number | null = null;
  let currentPrice: number | null = null;

  // 전체일 때 테이블
  let tableRows: Array<{
    code: string;
    name: string;
    baseClose: number;
    currentPrice: number;
    pnlPct: number;
  }> = [];

  $: stockOptions = buildOptions(get(holdings));

  function buildOptions(list: Holding[]): StockOption[] {
    return [
      { code: "ALL", name: "전체" },
      ...list.map((h) => ({ code: h.code, name: h.name })),
    ];
  }

  function toYmd(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function calcPnlPct(base: number, cur: number) {
    if (!base) return 0;
    return ((cur - base) / base) * 100;
  }

  async function fetchSingle(code: string, date: string) {
    // TODO: Firebase Functions/Hosting API로 교체
    // 예) const res = await fetch(`/api/kis/price?code=${code}&baseDate=${date}`);
    // 지금은 퍼블리싱용 더미 데이터
    const today = new Date();
    const points: PricePoint[] = Array.from({ length: 60 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (59 - i));
      const seed = (Number(code) % 97) + 1;
      const close = Math.round(50000 + seed * 120 + (Math.sin(i / 4) * 1200) + i * 15);
      return { date: toYmd(d), close };
    });

    const base = points.find((p) => p.date === date)?.close ?? points[points.length - 10].close;
    const cur = points[points.length - 1].close + Math.round(((Number(code) % 13) - 6) * 40);

    return { points, baseClose: base, currentPrice: cur };
  }

  async function runSearch() {
    loading = true;
    errorMsg = "";

    series = [];
    baseClose = null;
    currentPrice = null;
    tableRows = [];

    try {
      const list = get(holdings);

      if (selectedCode === "ALL") {
        // 전체: 종목별 수익률 테이블
        const rows = [];
        for (const h of list) {
          const r = await fetchSingle(h.code, baseDate);
          rows.push({
            code: h.code,
            name: h.name,
            baseClose: r.baseClose,
            currentPrice: r.currentPrice,
            pnlPct: calcPnlPct(r.baseClose, r.currentPrice),
          });
        }
        tableRows = rows.sort((a, b) => b.pnlPct - a.pnlPct);
      } else {
        // 단일: 요약 + 차트
        const r = await fetchSingle(selectedCode, baseDate);
        series = r.points;
        baseClose = r.baseClose;
        currentPrice = r.currentPrice;
      }
    } catch (e: any) {
      errorMsg = e?.message ?? "조회 중 오류가 발생했습니다.";
    } finally {
      loading = false;
    }
  }

  $: pnlPct = (baseClose != null && currentPrice != null)
    ? calcPnlPct(baseClose, currentPrice)
    : null;

  let qty = 10; // 임시 (나중에 holdings에서 가져옴)

  $: profitAmount =
  baseClose != null && currentPrice != null
    ? (currentPrice - baseClose) * qty
    : null;

  // 최초 1회 조회(원하면)
  // onMount(runSearch);

  let chartCount = 1;
  const MAX_CHARTS = 4;

  function addChart() {
    if (chartCount < MAX_CHARTS) {
      chartCount += 1;
    }
  }
</script>

<div class="mx-auto w-full max-w-6xl p-4 md:p-6">
  <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">내 주식 수익률</h1>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
        기준일 종가와 현재가를 비교해서 수익률을 보여줍니다.
      </p>
    </div>
  </div>

  <!-- 검색 조건 -->
  <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
      <div class="md:col-span-4">
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">기준일</label>
        <input
          type="date"
          bind:value={baseDate}
          class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900
                 outline-none ring-0 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div class="md:col-span-6">
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">보유 종목</label>
        <select
          bind:value={selectedCode}
          class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900
                 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {#each stockOptions as opt}
            <option value={opt.code}>{opt.name} {opt.code !== "ALL" ? `(${opt.code})` : ""}</option>
          {/each}
        </select>
      </div>

      <div class="md:col-span-2">
        <button
          on:click={runSearch}
          disabled={loading}
          class="w-full rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white
                 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {loading ? "조회중..." : "조회"}
        </button>
      </div>
    </div>

    {#if errorMsg}
      <div class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
        {errorMsg}
      </div>
    {/if}
  </div>

  <!-- 요약 + 차트추가 (70/30) -->
  <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-10">
    <!-- 요약: 70% -->
    <div class="md:col-span-7">
      <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">요약</div>

        {#if selectedCode === "ALL"}
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            “전체” 선택 시 종목별 수익률을 테이블로 보여줍니다.
          </p>
        {:else}
          <div class="mt-3 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300">기준일 종가</span>
              <span class="font-semibold text-slate-900 dark:text-slate-100">
                {baseClose != null ? `${baseClose.toLocaleString()}원` : "-"}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300">현재가</span>
              <span class="font-semibold text-slate-900 dark:text-slate-100">
                {currentPrice != null ? `${currentPrice.toLocaleString()}원` : "-"}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300">수익금액</span>
              <span class="font-semibold {profitAmount != null && profitAmount >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}">
                {profitAmount != null ? `${profitAmount.toLocaleString()}원` : "-"}
              </span>
            </div>

            <div class="flex items-center justify-between pt-2">
              <span class="text-slate-600 dark:text-slate-300">수익률</span>
              <span class="text-lg font-bold {pnlPct != null && pnlPct >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}">
                {pnlPct != null ? `${pnlPct.toFixed(2)}%` : "-"}
              </span>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- 차트추가: 30% -->
    <div class="md:col-span-3">
      <button
        on:click={addChart}
        disabled={chartCount >= MAX_CHARTS || selectedCode === "ALL"}
        class="
          h-full w-full
          rounded-3xl border-2 border-dashed border-slate-300
          bg-white/60 p-4
          transition hover:border-slate-400 hover:bg-white
          disabled:opacity-40
          dark:border-slate-700 dark:bg-slate-950/40
        "
      >
        <!-- ✅ 세로 레이아웃 -->
        <div class="flex h-full flex-col items-center justify-center">
          <!-- 메인(정중앙) -->
          <div class="flex items-center justify-center gap-2">
            <span class="text-lg">＋</span>
            <span class="whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-200">
              차트 추가 ({chartCount}/{MAX_CHARTS})
            </span>
          </div>

          <!-- ✅ 안내문: 10px 위로 -->
          {#if selectedCode === "ALL"}
            <div class="relative -top-2.5 mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              종목 선택 시 사용 가능
            </div>
          {/if}
        </div>
      </button>
    </div>
  </div>

  <!-- 차트/테이블 영역: 검색조건과 동일한 전체폭 -->
  <div class="mt-4">
    {#if selectedCode === "ALL"}
      {#if tableRows.length}
        <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
          <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">종목별 수익률</div>

          <div class="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                <tr>
                  <th class="px-3 py-2 text-left">종목</th>
                  <th class="px-3 py-2 text-right">기준 종가</th>
                  <th class="px-3 py-2 text-right">현재가</th>
                  <th class="px-3 py-2 text-right">수익률</th>
                </tr>
              </thead>
              <tbody>
                {#each tableRows as r}
                  <tr class="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/20">
                    <td class="px-3 py-2">
                      <div class="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">{r.code}</div>
                    </td>
                    <td class="px-3 py-2 text-right text-slate-700 dark:text-slate-200">{r.baseClose.toLocaleString()}원</td>
                    <td class="px-3 py-2 text-right text-slate-700 dark:text-slate-200">{r.currentPrice.toLocaleString()}원</td>
                    <td class="px-3 py-2 text-right font-semibold {r.pnlPct >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}">
                      {r.pnlPct.toFixed(2)}%
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else}
        <div class="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-white/40 p-8 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-950/20 dark:text-slate-300">
          “조회”를 누르면 전체 종목 수익률 테이블이 표시됩니다.
        </div>
      {/if}
    {:else}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {#each Array(chartCount) as _, i}
          <PriceChart {series} {baseDate} {baseClose} {currentPrice} />
        {/each}
      </div>
    {/if}
  </div>
</div>
