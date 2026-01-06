<script lang="ts">
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
  };

  let scenarioId = "builder-sample";
  let loading = false;
  let error = "";
  let data: StatsSummary | null = null;

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
    } catch (e: any) {
      error = e?.message ?? String(e);
    } finally {
      loading = false;
    }
  }

  function pct(n: number, d: number) {
    if (!d) return "0%";
    return `${Math.round((n / d) * 100)}%`;
  }

  // 최초 로드
  load();
</script>

<div class="wrap">
  <header class="top">
    <h1>Scenario Stats</h1>
    <div class="row">
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
    <section class="cards">
      <div class="card">
        <div class="k">Total Runs</div>
        <div class="v">{data.totalRuns}</div>
      </div>
      <div class="card">
        <div class="k">Completed Runs</div>
        <div class="v">{data.completedRuns}</div>
        <div class="s">{pct(data.completedRuns, data.totalRuns)}</div>
      </div>
      <div class="card">
        <div class="k">Avg Turns</div>
        <div class="v">{data.avgTurns.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="k">Avg Steps</div>
        <div class="v">{data.avgSteps.toFixed(2)}</div>
      </div>
    </section>

    <section class="panel">
      <h2>Drop-off</h2>
      <div class="grid2">
        <div class="mini">
          <div class="k">Awaiting Slot</div>
          <div class="v">{data.dropoff.slot}</div>
          <div class="s">{pct(data.dropoff.slot, data.totalRuns)}</div>
        </div>
        <div class="mini">
          <div class="k">Awaiting Branch</div>
          <div class="v">{data.dropoff.branch}</div>
          <div class="s">{pct(data.dropoff.branch, data.totalRuns)}</div>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Slot 선택 분포 (slots.data)</h2>
      <table>
        <thead><tr><th>value</th><th>count</th></tr></thead>
        <tbody>
          {#each Object.entries(data.slotDist) as [k, v]}
            <tr><td>{k}</td><td>{v}</td></tr>
          {/each}
          {#if Object.keys(data.slotDist).length === 0}
            <tr><td colspan="2" class="empty">데이터 없음</td></tr>
          {/if}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Branch 선택 분포 (condId)</h2>
      <table>
        <thead><tr><th>cond</th><th>count</th></tr></thead>
        <tbody>
          {#each Object.entries(data.branchDist) as [k, v]}
            <tr><td>{k}</td><td>{v}</td></tr>
          {/each}
          {#if Object.keys(data.branchDist).length === 0}
            <tr><td colspan="2" class="empty">데이터 없음</td></tr>
          {/if}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Runs by Day (완료 기준)</h2>
      <table>
        <thead><tr><th>day</th><th>runs</th></tr></thead>
        <tbody>
          {#each data.byDay as r}
            <tr><td>{r.day}</td><td>{r.runs}</td></tr>
          {/each}
          {#if data.byDay.length === 0}
            <tr><td colspan="2" class="empty">데이터 없음</td></tr>
          {/if}
        </tbody>
      </table>
    </section>
  {/if}
</div>

<style>
  .wrap{max-width:1100px;margin:0 auto;padding:18px}
  .top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
  h1{margin:0;font-size:18px}
  .row{display:flex;gap:8px;align-items:center}
  .input{padding:8px 10px;border:1px solid #ccc;border-radius:10px}
  .btn{padding:8px 12px;border-radius:10px;border:1px solid #ccc;background:#111;color:#fff}
  .error{margin:10px 0;padding:10px;border-radius:10px;background:rgba(255,0,0,.06);border:1px solid rgba(255,0,0,.18)}

  .cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
  @media(max-width:900px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .card{border:1px solid #ddd;border-radius:12px;padding:12px}
  .k{opacity:.7;font-size:12px}
  .v{font-size:20px;font-weight:800}
  .s{margin-top:4px;opacity:.7;font-size:12px}

  .panel{border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:12px;background:#fff;margin-bottom:12px}
  h2{margin:0 0 10px;font-size:14px}

  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .mini{border:1px solid #eee;border-radius:12px;padding:12px}

  table{width:100%;border-collapse:collapse}
  th,td{border-bottom:1px solid #eee;padding:8px;text-align:left}
  .empty{text-align:center;opacity:.6}
</style>
