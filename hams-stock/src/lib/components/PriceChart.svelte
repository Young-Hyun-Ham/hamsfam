<script lang="ts">
  import type { PricePoint } from "$lib/types";
  import { onDestroy, onMount } from "svelte";

  export let series: PricePoint[] = [];
  export let baseDate: string = ""; // 기준일(YYYY-MM-DD)
  export let baseClose: number | null = null;
  export let currentPrice: number | null = null;

  let canvasEl: HTMLCanvasElement | null = null;
  let chart: any = null;

  type Granularity = "D" | "M" | "Y";

  /**
   * series 전체 기간을 보고 일/월/년 판단
   */
  function inferGranularity(series: { date: string }[]): Granularity {
    if (!series || series.length < 2) return "D";

    const first = new Date(series[0].date + "T00:00:00");
    const last = new Date(series[series.length - 1].date + "T00:00:00");
    const days = Math.floor((last.getTime() - first.getTime()) / 86400000);

    if (days > 365) return "Y";
    if (days > 30) return "M";
    return "D";
  }

  function formatAxisDate(ymd: string, g: Granularity) {
    if (!ymd) return "";
    const d = new Date(ymd + "T00:00:00");

    if (g === "Y") {
      return String(d.getFullYear());          // 2023
    }
    if (g === "M") {
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${d.getFullYear()}-${m}`;        // 2023-07
    }

    // D
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}-${dd}`;                      // 07-21
  }


  function formatWon(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return String(v ?? "");
    return `${n.toLocaleString()}원`;
  }

  function isDark() {
    return document.documentElement.classList.contains("dark");
  }

  function getThemeColors() {
    // 차트 내부 색상(다크/라이트 가독성)
    const dark = isDark();
    return {
      tick: dark ? "rgba(226,232,240,0.70)" : "rgba(51,65,85,0.70)", // slate-200/700 느낌
      grid: dark ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.25)",
      line: isDark()
        ? "rgba(52,211,153,1)"   // emerald-400
        : "rgba(16,185,129,1)",  // emerald-500
    };
  }

  // SSR 안전: onMount에서만 chart.js import
  onMount(async () => {
    const { Chart, registerables } = await import("chart.js/auto");
    Chart.register(...registerables);

    if (!canvasEl) return;

    const labels = series.map((p) => p.date);
    const data = series.map((p) => p.close);

    const colors = getThemeColors();
    const granularity = inferGranularity(series);

    chart = new Chart(canvasEl, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "종가",
            data,
            tension: 0.25,

            // 평소엔 거의 안 보이게(또는 아주 작게)
            pointRadius: 1.5,
            pointHitRadius: 10,      // 마우스 오버 판정 범위(핵심)
            pointHoverRadius: 5,     // 호버 시 커짐
            pointBorderWidth: 2,
            pointHoverBorderWidth: 2,

            // 포인트 스타일(테마에 맞게)
            pointBackgroundColor: isDark() ? "rgba(2,6,23,0.95)" : "rgba(255,255,255,0.95)",
            pointBorderColor: colors.line,
            pointHoverBackgroundColor: colors.line,
            pointHoverBorderColor: isDark() ? "rgba(2,6,23,0.95)" : "rgba(255,255,255,0.95)",

            borderWidth: 1.8,
            borderColor: colors.line,
          },
        ],
      },
      plugins: [baseDateLinePlugin], // 기준일 세로선 플러그인 등록
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }, // 더 모던하게(원하면 true로 되돌려도 됨)
          tooltip: {
            enabled: true,
            displayColors: false,
            callbacks: {
              // 상단 제목: 원본 날짜
              // title: (items: any[]) => {
              //   const idx = items?.[0]?.dataIndex ?? 0;
              //   const d = series?.[idx]?.date ?? "";
              //   return d ? `날짜: ${d}` : "";
              // },
              title: (items: any[]) => {
                const idx = items[0]?.dataIndex ?? 0;
                const d = labels[idx];
                return formatAxisDate(d, granularity);
              },
              // 라벨: 원화 포맷
              label: (item: any) => `종가: ${formatWon(item.parsed?.y)}`,
            },
          },
          baseDateLine: {
            baseDate,
            labels,
            color: isDark()
              ? "rgba(34,197,94,0.70)"
              : "rgba(168,85,247,0.75)",
            dash: [6, 6],
            label: `기준일 ${baseDate.slice(5)}`,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: colors.tick,
              autoSkip: true,
              maxRotation: 0,
              minRotation: 0,
              maxTicksLimit:
                granularity === "Y" ? 6 :
                granularity === "M" ? 8 :
                10,
              callback: (_value: any, index: any) => {
                const d = labels[index];
                return formatAxisDate(d, granularity);
              },
            },
          },
          y: {
            beginAtZero: false,
            grid: { color: colors.grid },
            ticks: {
              color: colors.tick,
              callback: (v: any) => {
                const n = Number(v);
                if (!Number.isFinite(n)) return String(v ?? "");
                return n.toLocaleString();
              },
            },
          },
        },
        events: ["click", "touchstart", "touchend"],
        interaction: {
          mode: "nearest",
          intersect: true,
        },
      } as any,
    });
  });

  onDestroy(() => {
    try {
      chart?.destroy?.();
    } catch {}
  });

  // series 변경 시 업데이트 + 테마 컬러도 즉시 반영
  $: if (chart) {
    const labels = series.map((p) => p.date);
    const data = series.map((p) => p.close);

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;

    const colors = getThemeColors();
    chart.data.datasets[0].borderColor = colors.line;

    // tick/grid 색 갱신
    if (chart.options?.scales?.x?.ticks) chart.options.scales.x.ticks.color = colors.tick;
    if (chart.options?.scales?.y?.ticks) chart.options.scales.y.ticks.color = colors.tick;
    if (chart.options?.scales?.y?.grid) chart.options.scales.y.grid.color = colors.grid;
    // 기준선 옵션 업데이트
    (chart.options.plugins as any).baseDateLine = {
      baseDate,
      labels,
      color: isDark() ? "rgba(34,197,94,0.70)" : "rgba(168,85,247,0.75)",
      dash: [6, 6],
      label: `기준일 ${baseDate.slice(5)}`, // 예: 기준일 02-03
    };

    chart.update();
  }

  function getBaseIndex(labels: any[], baseDate: string) {
    if (!baseDate) return -1;
    return labels.findIndex((d) => String(d) === baseDate);
  }

  // ✅ 기준일 세로선 + 라벨 플러그인
  const baseDateLinePlugin = {
    id: "baseDateLine",
    afterDraw(chartInstance: any, _args: any, pluginOptions: any) {
      const { baseDate, labels, color, dash, label } = pluginOptions ?? {};
      if (!baseDate || !labels?.length) return;

      const idx = getBaseIndex(labels, baseDate);
      if (idx < 0) return;

      const xScale = chartInstance.scales?.x;
      if (!xScale) return;

      // ✅ autoSkip 환경에서도 정확한 x를 얻기 위해 "데이터 요소의 x"를 우선 사용
      const meta = chartInstance.getDatasetMeta?.(0);
      const el = meta?.data?.[idx]; // 해당 데이터 포인트 요소
      const x =
        el?.x ??
        (xScale.getPixelForValue ? xScale.getPixelForValue(baseDate) : xScale.getPixelForValue(labels[idx]));


      const area = chartInstance.chartArea ?? {};
      const top = area.top;
      const bottom = area.bottom;
      const left = area.left;
      const right = area.right;
      if ([top, bottom, left, right].some((v) => v == null)) return;

      const ctx = chartInstance.ctx;
      const stroke = color ?? "rgba(168,85,247,0.75)";

      // 1) 세로선
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(Array.isArray(dash) ? dash : [6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.restore();

      // 2) 라벨 배지(상단)
      const text = label ?? "기준일";
      const fontSize = 11;
      const padX = 8;
      const padY = 4;
      const radius = 10;

      ctx.save();
      ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      const textW = ctx.measureText(text).width;
      const boxW = Math.ceil(textW + padX * 2);
      const boxH = fontSize + padY * 2;

      // 배지 위치: 차트 상단(top) 근처, x 중심에 맞추되 차트 영역 밖으로 나가지 않게 clamp
      let bx = Math.round(x - boxW / 2);
      const by = Math.round(top + 8);

      const minX = Math.round(left + 6);
      const maxX = Math.round(right - boxW - 6);
      bx = Math.max(minX, Math.min(maxX, bx));

      // 배지 배경/테두리/텍스트 색
      const dark = document.documentElement.classList.contains("dark");
      const bg = dark ? "rgba(2,6,23,0.85)" : "rgba(255,255,255,0.85)";
      const border = dark ? "rgba(148,163,184,0.25)" : "rgba(51,65,85,0.18)";
      const textColor = stroke;

      // 라운드 rect
      ctx.beginPath();
      const x0 = bx, y0 = by, w = boxW, h = boxH, r = radius;
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
      ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      ctx.arcTo(x0, y0 + h, x0, y0, r);
      ctx.arcTo(x0, y0, x0 + w, y0, r);
      ctx.closePath();

      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = border;
      ctx.stroke();

      // 텍스트
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + padX, by + boxH / 2);

      ctx.restore();
    },
  };
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
