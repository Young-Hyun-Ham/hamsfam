<script lang="ts">
    import type { PricePoint } from "$lib/types";
  import { onDestroy, onMount } from "svelte";

  export let series: PricePoint[] = [];
  export let baseDate: string = "";        // 기준일(YYYY-MM-DD)
  export let baseClose: number | null = null;
  export let currentPrice: number | null = null;

  let canvasEl: HTMLCanvasElement | null = null;
  let chart: any = null;

  // SSR 안전을 위해 onMount에서만 import
  onMount(async () => {
    const { Chart, registerables } = await import("chart.js/auto");
    Chart.register(...registerables);

    if (!canvasEl) return;

    const labels = series.map((p) => p.date);
    const data = series.map((p) => p.close);

    chart = new Chart(canvasEl, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "종가",
            data,
            tension: 0.25,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 6 } },
          y: { beginAtZero: false },
        },
      },
    });

    // 기준일/현재가 마커는 “간단 퍼블리싱”으로 tooltip/보조 텍스트로 처리
    // (원하면 annotation 플러그인으로 기준일 세로선 추가 가능)
  });

  onDestroy(() => {
    try { chart?.destroy?.(); } catch {}
  });

  $: if (chart) {
    chart.data.labels = series.map((p) => p.date);
    chart.data.datasets[0].data = series.map((p) => p.close);
    chart.update();
  }
</script>

<div class="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">가격 차트</div>

    <div class="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
      {#if baseDate && baseClose != null}
        <span class="rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          기준일 {baseDate}: {baseClose.toLocaleString()}원
        </span>
      {/if}
      {#if currentPrice != null}
        <span class="rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          현재가: {currentPrice.toLocaleString()}원
        </span>
      {/if}
    </div>
  </div>

  <div class="mt-3 h-[260px]">
    <canvas bind:this={canvasEl}></canvas>
  </div>
</div>
