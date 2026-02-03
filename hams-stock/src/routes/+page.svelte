<!-- src/routes/+page.svelte -->
<script lang="ts">
  import PriceChart from "$lib/components/PriceChart.svelte";
  import { holdings, type Holding } from "$lib/stores/holdings";
  import type { PricePoint } from "$lib/types";
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  // =======================================================================
  // 다크/라이트 모드
  let mode: "light" | "dark" = "light";

  function applyMode(next: "light" | "dark") {
    mode = next;
    if (!browser) return;

    const root = document.documentElement; // <html>
    root.classList.toggle("dark", mode === "dark");
    localStorage.setItem("hams:theme", mode);
  }

  function toggleMode() {
    applyMode(mode === "dark" ? "light" : "dark");
  }

  // ✅ 테마별 히어로 배경(보색 느낌)
  // 라이트: 퍼플/핑크 계열
  // 다크: 라임/앰버/시안 계열 (퍼플의 보색 느낌으로 반전)
  $: heroBgStyle =
    mode === "dark"
      ? `background-image:
          radial-gradient(900px circle at 15% 10%, rgba(34,197,94,0.22), transparent 55%),
          radial-gradient(800px circle at 80% 0%, rgba(251,191,36,0.18), transparent 50%),
          radial-gradient(900px circle at 50% 85%, rgba(6,182,212,0.16), transparent 55%);`
      : `background-image:
          radial-gradient(900px circle at 15% 10%, rgba(168,85,247,0.35), transparent 55%),
          radial-gradient(800px circle at 80% 0%, rgba(99,102,241,0.28), transparent 50%),
          radial-gradient(900px circle at 50% 85%, rgba(236,72,153,0.18), transparent 55%);`;

  // ✅ 페이지 바닥색도 테마에 맞게 반전(라이트는 밝게, 다크는 더 깊게)
  $: pageBgClass =
    mode === "dark"
      ? "bg-slate-950 text-slate-100"
      : "bg-white text-slate-900";

  onMount(() => {
    if (!browser) return;

    const saved = localStorage.getItem("hams:theme") as "light" | "dark" | null;
    if (saved === "light" || saved === "dark") {
      applyMode(saved);
    } else {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      applyMode(prefersDark ? "dark" : "light");
    }
  });
  // =======================================================================

  type StockOption = { code: string; name: string };

  // ===== Utils
  function toYmd(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
  }

  // 데모용: 종목코드 기반 시계열 생성(퍼블리싱/레이아웃 확인용)
  function makeDemoSeries(code: string, baseDate: string): PricePoint[] {
    // seed
    let seed = 0;
    for (const ch of (code + baseDate)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const today = new Date();
    const points: PricePoint[] = [];
    const days = 30;

    // base close: 30k ~ 220k
    let price = Math.round(30000 + rand() * 190000);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      // 주말도 포함(퍼블리싱용)
      const drift = (rand() - 0.5) * 0.03; // -1.5% ~ +1.5%
      price = Math.round(price * (1 + drift));
      price = clamp(price, 5000, 500000);

      points.push({ date: toYmd(d), close: price });
    }
    return points;
  }

  // ===== 검색 조건
  let baseDate = toYmd(new Date());
  let selectedCode = "ALL"; // ALL = 전체

  // ===== 상태
  let loading = false;
  let errorMsg = "";

  // 단일 종목 차트/요약
  let series: PricePoint[] = [];
  let baseClose: number | null = null;
  let currentPrice: number | null = null;

  // UI 데이터
  let options: StockOption[] = [];
  let holdingList: Holding[] = [];

  // 파생 KPI(퍼블리싱용)
  $: holdingCount = holdingList.length;
  $: selectedHolding = selectedCode === "ALL"
    ? null
    : holdingList.find((h) => h.code === selectedCode) ?? null;

  $: delta = baseClose != null && currentPrice != null ? currentPrice - baseClose : null;
  $: deltaPct =
    baseClose != null && currentPrice != null && baseClose !== 0
      ? (delta! / baseClose) * 100
      : null;

  // 더미 평가금액(보유수량 기반)
  $: estimatedValue =
    selectedHolding && currentPrice != null
      ? selectedHolding.qty * currentPrice
      : null;

  onMount(() => {
    holdingList = get(holdings);
    options = [
      { code: "ALL", name: "전체" },
      ...holdingList.map((h) => ({ code: h.code, name: `${h.name} (${h.code})` })),
    ];
  });

  async function fetchDemo() {
    errorMsg = "";
    loading = true;

    try {
      // 전체는 차트 비활성(요구사항 스타일)
      if (selectedCode === "ALL") {
        series = [];
        baseClose = null;
        currentPrice = null;
        loading = false;
        return;
      }

      const s = makeDemoSeries(selectedCode, baseDate);
      series = s;

      // 기준일: baseDate와 가장 가까운 지점으로 매칭(퍼블리싱용)
      const idx = Math.max(0, s.findIndex((p) => p.date >= baseDate));
      const baseIdx = idx === -1 ? 0 : idx;

      baseClose = s[baseIdx]?.close ?? null;
      currentPrice = s[s.length - 1]?.close ?? null;
    } catch (e: any) {
      errorMsg = e?.message ?? "조회 중 오류가 발생했어요.";
    } finally {
      loading = false;
    }
  }

  function resetFilters() {
    baseDate = toYmd(new Date());
    selectedCode = "ALL";
    series = [];
    baseClose = null;
    currentPrice = null;
    errorMsg = "";
  }
</script>

<div class={"min-h-[calc(100dvh-0px)] " + pageBgClass}>
  <!-- ===== Top Hero / Header -->
  <div class="relative overflow-hidden">
    <div
      class="absolute inset-0 -z-10"
      style={heroBgStyle}
    ></div>

    <div class="mx-auto w-full max-w-6xl px-4 pb-4 pt-8 sm:px-6">
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/30 px-3 py-1 text-xs text-slate-800 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-200">
              <span class="h-2 w-2 rounded-full bg-violet-500"></span>
              hams-stock · Portfolio Dashboard
            </div>
            <h1 class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
              주식 보유 현황
              <span class="ml-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                메인 대시보드
              </span>
            </h1>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              기준일 대비 흐름을 빠르게 확인하고, 종목별 차트를 직관적으로 조회하세요.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="group flex items-center gap-1.5 rounded-2xl border border-white/20
                    bg-white/40 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm
                    backdrop-blur transition hover:bg-white/60
                    dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-100
                    dark:hover:bg-slate-950/55"
              on:click={toggleMode}
              aria-label="테마 전환"
              title="테마 전환"
            >
              <!-- 아이콘 (항상 표시) -->
              <span class="text-sm">
                {mode === "dark" ? "☀️" : "🌙"}
              </span>

              <!-- 텍스트 (sm 이상에서만 표시) -->
              <span class="hidden sm:inline">
                {mode === "dark" ? "라이트" : "다크"}
              </span>
            </button>
          </div>
        </div>

        <!-- ===== Search Card -->
        <div class="rounded-3xl border border-white/20 bg-white/40 p-4 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr_160px] sm:items-end">
            <div>
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-200">기준일</label>
              <input
                type="date"
                bind:value={baseDate}
                class="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-900/40"
              />
            </div>

            <div>
              <div class="flex items-end justify-between">
                <label class="text-xs font-semibold text-slate-700 dark:text-slate-200">종목</label>

                <!-- ✅ 요청했던 문구: "검색조건 아래 우측" 느낌으로, 살짝 위로 -->
                <span class="-mb-[2px] text-[11px] text-slate-500 dark:text-slate-400">
                  종목 선택 시 사용 가능
                </span>
              </div>

              <select
                bind:value={selectedCode}
                class="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-900/40"
              >
                {#each options as opt}
                  <option value={opt.code}>{opt.name}</option>
                {/each}
              </select>
            </div>

            <div class="flex gap-2 sm:justify-end">
              <button
                class="w-full rounded-2xl border border-white/20 bg-white/40 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white/60 disabled:opacity-60 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-950/55 sm:w-auto"
                on:click={resetFilters}
                disabled={loading}
              >
                초기화
              </button>
              <button
                class="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 active:brightness-95 disabled:opacity-60 sm:w-auto"
                on:click={fetchDemo}
                disabled={loading}
              >
                {loading ? "조회 중..." : "조회"}
              </button>
            </div>
          </div>

          {#if errorMsg}
            <div class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {errorMsg}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- ===== Main Content -->
  <div class="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
    <!-- KPI Row -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">보유 종목</div>
        <div class="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-50">{holdingCount}</div>
        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">현재 store 기준</div>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">선택 종목</div>
        <div class="mt-2 truncate text-lg font-extrabold text-slate-900 dark:text-slate-50">
          {selectedHolding ? selectedHolding.name : "전체"}
        </div>
        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {selectedHolding ? selectedHolding.code : "—"}
        </div>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">기준일 대비</div>
        <div class="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
          {#if delta != null}
            <span class={delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
              {delta >= 0 ? "+" : ""}{delta.toLocaleString()}
            </span>
            <span class="ml-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              ({deltaPct != null ? (deltaPct >= 0 ? "+" : "") + deltaPct.toFixed(2) + "%" : ""})
            </span>
          {:else}
            <span class="text-slate-400 dark:text-slate-500">—</span>
          {/if}
        </div>
        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">단일 종목 선택 시</div>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">평가금액(추정)</div>
        <div class="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
          {#if estimatedValue != null}
            {estimatedValue.toLocaleString()}원
          {:else}
            <span class="text-slate-400 dark:text-slate-500">—</span>
          {/if}
        </div>
        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">수량×현재가</div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <!-- Holdings Table -->
      <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="text-sm font-extrabold text-slate-900 dark:text-slate-50">보유 종목 리스트</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">종목을 선택하면 우측에 차트가 활성화됩니다.</div>
          </div>

          <div class="rounded-2xl bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
            {baseDate}
          </div>
        </div>

        <div class="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th class="px-3 py-2">종목</th>
                <th class="px-3 py-2">코드</th>
                <th class="px-3 py-2 text-right">수량</th>
                <th class="px-3 py-2 text-right">바로선택</th>
              </tr>
            </thead>
            <tbody>
              {#each holdingList as h (h.code)}
                <tr class="border-t border-slate-200 bg-white/60 hover:bg-white dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-950/35">
                  <td class="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">{h.name}</td>
                  <td class="px-3 py-3 text-slate-600 dark:text-slate-300">{h.code}</td>
                  <td class="px-3 py-3 text-right tabular-nums text-slate-800 dark:text-slate-200">{h.qty}</td>
                  <td class="px-3 py-3 text-right">
                    <button
                      class="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
                      on:click={() => {
                        selectedCode = h.code;
                        fetchDemo();
                      }}
                    >
                      선택
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-950/40">
            <span class="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
            전체 선택 시 차트 비활성
          </span>
          <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-950/40">
            <span class="h-1.5 w-1.5 rounded-full bg-fuchsia-500"></span>
            데모 데이터로 퍼블리싱 확인
          </span>
        </div>
      </div>

      <!-- Chart / Detail -->
      <div class="space-y-4">
        {#if selectedCode === "ALL"}
          <div class="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div class="text-sm font-extrabold text-slate-900 dark:text-slate-50">차트</div>
            <div class="mt-2 text-sm text-slate-600 dark:text-slate-300">
              종목을 선택하면 기준일 대비 가격 흐름을 차트로 보여줘요.
            </div>

            <div class="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white/50 p-6 text-center dark:border-slate-700 dark:bg-slate-950/20">
              <div class="text-lg font-extrabold text-slate-900 dark:text-slate-50">종목을 선택하세요</div>
              <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                왼쪽 리스트에서 <b class="text-slate-700 dark:text-slate-200">선택</b> 버튼을 누르면 바로 조회됩니다.
              </div>
            </div>
          </div>
        {:else}
          <PriceChart {series} {baseDate} {baseClose} {currentPrice} />
        {/if}

        <!-- Quick Info Card -->
        <div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-extrabold text-slate-900 dark:text-slate-50">요약</div>
            <span class="text-xs text-slate-500 dark:text-slate-400">UI 퍼블리싱</span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">기준가</div>
              <div class="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-50">
                {baseClose != null ? baseClose.toLocaleString() + "원" : "—"}
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">현재가</div>
              <div class="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-50">
                {currentPrice != null ? currentPrice.toLocaleString() + "원" : "—"}
              </div>
            </div>
          </div>

          <div class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            ※ 실제 API 연동 시 `fetchDemo()`만 API 호출로 교체하면, 화면 구조는 그대로 유지됩니다.
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
