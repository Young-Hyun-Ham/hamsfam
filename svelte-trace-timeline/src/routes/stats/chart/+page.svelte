<script lang="ts">
  import { onMount } from "svelte";
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    BarController,
    BarElement,
    ArcElement,
    DoughnutController,
    Tooltip,
    Legend,
    Title
  } from "chart.js";

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    BarController,
    BarElement,
    ArcElement,
    DoughnutController,
    Tooltip,
    Legend,
    Title
  );

  const ENGINE_URL = import.meta.env.VITE_ENGINE_URL ?? "http://127.0.0.1:8000";

  type StatsSummary = {
    ok: boolean;
    scenarioId: string;
    totalRuns: number;
    completedRuns: number;
    dropoff: { slot: number; branch: number };
    slotDist: Record<string, number>;
    branchDist: Record<string, number>;
    avgTurns: number;
    avgSteps: number;
    byDay: { day: string; runs: number }[];
    byHour: any[],
    targetDay: string,
  };

  let scenarioId = "builder-sample";
  let loading = false;
  let error = "";
  let data: StatsSummary | null = null;

  let byDayCanvas: HTMLCanvasElement | null = null;
  let slotCanvas: HTMLCanvasElement | null = null;
  let branchCanvas: HTMLCanvasElement | null = null;
  let funnelCanvas: HTMLCanvasElement | null = null;

  let chartByDay: Chart | null = null;
  let chartSlot: Chart | null = null;
  let chartBranch: Chart | null = null;
  let chartFunnel: Chart | null = null;

  function destroyCharts() {
    chartByDay?.destroy(); chartByDay = null;
    chartSlot?.destroy(); chartSlot = null;
    chartBranch?.destroy(); chartBranch = null;
    chartFunnel?.destroy(); chartFunnel = null;
  }

  function pct(n: number, d: number) {
    if (!d) return "0%";
    return `${Math.round((n / d) * 100)}%`;
  }

  async function load() {
    loading = true;
    error = "";
    try {
      const res = await fetch(
        `${ENGINE_URL}/stats/summary?scenarioId=${encodeURIComponent(scenarioId)}`
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${t}`);
      }
      data = (await res.json()) as StatsSummary;
      renderCharts();
    } catch (e: any) {
      error = e?.message ?? String(e);
      data = null;
      destroyCharts();
    } finally {
      loading = false;
    }
  }

  function renderCharts() {
    if (!data) return;
    destroyCharts();

    // Runs by Day (Line)
    if (byDayCanvas) {
      // const labels = (data.byDay ?? []).map((r) => r.day);
      // const values = (data.byDay ?? []).map((r) => r.runs);
      // const { labels, values } = buildHourlyBucketsToday(
      //   data.completedTimestamps ?? []
      // );

      const labels = (data.byHour ?? []).map((r) => `${String(r.hour).padStart(2,"0")}:00`);
      const values = (data.byHour ?? []).map((r) => r.runs);

      chartByDay = new Chart(byDayCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Completed Runs (Today)",
              data: values,
              tension: 0.25,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Runs by Hour (Today 00:00 ~ 23:00)"
            }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Funnel (Bar)
    if (funnelCanvas) {
      const total = data.totalRuns ?? 0;
      const completed = data.completedRuns ?? 0;
      const dropSlot = data.dropoff?.slot ?? 0;
      const dropBranch = data.dropoff?.branch ?? 0;

      chartFunnel = new Chart(funnelCanvas, {
        type: "bar",
        data: {
          labels: ["Total Runs", "Completed", "Drop@Slot", "Drop@Branch"],
          datasets: [{ label: "Count", data: [total, completed, dropSlot, dropBranch] }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: "Run Funnel / Drop-off" }, legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Slot dist (Doughnut)
    if (slotCanvas) {
      const entries = Object.entries(data.slotDist ?? {});
      const labels = entries.map(([k]) => `data=${k}`);
      const values = entries.map(([, v]) => v);

      chartSlot = new Chart(slotCanvas, {
        type: "doughnut",
        data: { labels, datasets: [{ label: "Slot 선택", data: values }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: "Slot 선택 분포 (slots.data)" } }
        }
      });
    }

    // Branch dist (Doughnut)
    if (branchCanvas) {
      const entries = Object.entries(data.branchDist ?? {});
      const labels = entries.map(([k]) => k);
      const values = entries.map(([, v]) => v);

      chartBranch = new Chart(branchCanvas, {
        type: "doughnut",
        data: { labels, datasets: [{ label: "Branch 선택", data: values }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: "Branch 선택 분포 (condId)" } }
        }
      });
    }
  }

  onMount(() => {
    load();
    return () => destroyCharts();
  });

  function buildHourlyBucketsToday(timestamps: string[]) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const buckets = new Array(24).fill(0);

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    for (const ts of timestamps) {
      const dt = new Date(ts);
      if (
        dt.getFullYear() === y &&
        dt.getMonth() === m &&
        dt.getDate() === d
      ) {
        buckets[dt.getHours()] += 1;
      }
    }

    return {
      labels: hours.map((h) => `${String(h).padStart(2, "0")}:00`),
      values: buckets
    };
  }
</script>

<div class="wrap">
  <header class="top">
    <div>
      <h1>Scenario Stats Dashboard</h1>
      <div class="sub">Chart.js · scenarioId 단위 집계</div>
    </div>

    <div class="controls">
      <input class="input" bind:value={scenarioId} placeholder="scenarioId" />
      <button class="btn" on:click={load} disabled={loading}>
        {loading ? "Loading..." : "Reload"}
      </button>
    </div>
  </header>

  {#if error}
    <div class="error">⚠ {error}</div>
  {/if}

  {#if data}
    <section class="kpis">
      <div class="kpi">
        <div class="k">Total Runs</div>
        <div class="v">{data.totalRuns}</div>
      </div>
      <div class="kpi">
        <div class="k">Completed</div>
        <div class="v">{data.completedRuns}</div>
        <div class="s">{pct(data.completedRuns, data.totalRuns)}</div>
      </div>
      <div class="kpi">
        <div class="k">Avg Turns</div>
        <div class="v">{data.avgTurns.toFixed(2)}</div>
      </div>
      <div class="kpi">
        <div class="k">Avg Steps</div>
        <div class="v">{data.avgSteps.toFixed(2)}</div>
      </div>
    </section>

    <section class="grid">
      <div class="card wide">
        <div class="chartArea chartAreaTall">
          <canvas bind:this={byDayCanvas}></canvas>
        </div>
        {#if (data.byDay?.length ?? 0) === 0}
          <div class="hint">Runs by Day 데이터가 없습니다. (완료된 run 필요)</div>
        {/if}
      </div>

      <div class="card">
        <div class="chartArea">
          <canvas bind:this={funnelCanvas}></canvas>
        </div>
      </div>

      <div class="card">
        <div class="chartArea">
          <canvas bind:this={slotCanvas}></canvas>
        </div>
        {#if Object.keys(data.slotDist ?? {}).length === 0}
          <div class="hint">slotDist가 비어있습니다. (slots.data 저장된 run 필요)</div>
        {/if}
      </div>

      <div class="card">
        <div class="chartArea">
          <canvas bind:this={branchCanvas}></canvas>
        </div>
        {#if Object.keys(data.branchDist ?? {}).length === 0}
          <div class="hint">branchDist가 비어있습니다. (branch 선택 기록 필요)</div>
        {/if}
      </div>
    </section>
  {/if}
</div>

<style>
  .wrap { max-width: 1200px; margin: 0 auto; padding: 18px; }
  .top { display:flex; justify-content:space-between; gap: 12px; align-items:flex-start; margin-bottom: 12px; }
  h1 { margin: 0; font-size: 18px; }
  .sub { opacity: .7; font-size: 12px; margin-top: 4px; }

  .controls { display:flex; gap: 8px; align-items:center; }
  .input { padding: 8px 10px; border: 1px solid #ccc; border-radius: 10px; min-width: 220px; }
  .btn { padding: 8px 12px; border-radius: 10px; border: 1px solid #ccc; background: #111; color:#fff; cursor:pointer; }
  .btn:disabled { opacity: .6; cursor:not-allowed; }

  .error { margin: 10px 0; padding: 10px; border-radius: 10px; background: rgba(255,0,0,.06); border: 1px solid rgba(255,0,0,.18); }

  .kpis { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
  @media (max-width: 980px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

  .kpi { border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 12px; background: #fff; }
  .k { opacity: .7; font-size: 12px; }
  .v { font-size: 20px; font-weight: 800; }
  .s { margin-top: 4px; opacity: .7; font-size: 12px; }

  .grid { display:grid; grid-template-columns: 2fr 1fr; gap: 12px; }
  @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }

  .card {
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 12px;
    padding: 12px;
    background: #fff;
  }

  .wide { grid-column: 1 / -1; }

  /* ✅ 핵심: 캔버스에 height:100% 강제하지 말고, 고정 높이 컨테이너로 제어 */
  .chartArea {
    position: relative;
    height: 300px;
  }
  .chartAreaTall {
    height: 420px;
  }

  /* canvas는 기본값으로 둔다(Chart.js가 내부에서 사이즈 제어) */
  canvas { display: block; }

  .hint {
    margin-top: 10px;
    padding: 10px;
    border-radius: 10px;
    border: 1px dashed rgba(0,0,0,.25);
    opacity: .7;
    font-size: 12px;
    background: rgba(0,0,0,.02);
  }
</style>
