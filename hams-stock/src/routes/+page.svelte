<!-- src/routes/+page.svelte -->
<script lang="ts">
  import PriceChart from "$lib/components/PriceChart.svelte";
  import { holdings, type Holding } from "$lib/stores/holdings";
  import type { PricePoint } from "$lib/types";
  import { get } from "svelte/store";
  import { onMount } from "svelte";

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

  // 파생 KPI
  $: holdingCount = holdingList.length;
  $: selectedHolding =
    selectedCode === "ALL"
      ? null
      : holdingList.find((h) => h.code === selectedCode) ?? null;

  $: delta =
    baseClose != null && currentPrice != null ? currentPrice - baseClose : null;

  $: deltaPct =
    baseClose != null && currentPrice != null && baseClose !== 0
      ? (delta! / baseClose) * 100
      : null;

  // 더미 평가금액(보유수량 기반)
  $: estimatedValue =
    selectedHolding && currentPrice != null ? selectedHolding.qty * currentPrice : null;

  onMount(() => {
    holdingList = get(holdings);
    options = [
      { code: "ALL", name: "전체" },
      ...holdingList.map((h) => ({ code: h.code, name: `${h.name} (${h.code})` })),
    ];
  });

  function diffDays(aYmd: string, bYmd: string) {
    const a = new Date(aYmd + "T00:00:00");
    const b = new Date(bYmd + "T00:00:00");
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
  }

  function addDays(ymd: string, days: number) {
    const d = new Date(ymd + "T00:00:00");
    d.setDate(d.getDate() + days);
    return toYmd(d);
  }

  async function fetchKis() {
    errorMsg = "";
    loading = true;

    try {
      if (selectedCode === "ALL") {
        series = [];
        baseClose = null;
        currentPrice = null;
        loading = false;
        return;
      }

      const today = toYmd(new Date());
      const daysFromBase = diffDays(baseDate, today);

      // ✅ 규칙: 30일 이내=D(최근30일), 30초과=M(기준~오늘), 365초과=Y(기준~오늘)
      const period = daysFromBase > 365 ? "Y" : daysFromBase > 30 ? "M" : "D";

      const from = period === "D" ? addDays(today, -30) : baseDate;
      const to = today;

      // 1) 차트 시리즈
      const r1 = await fetch(
        `/api/kis/daily?code=${selectedCode}&from=${from}&to=${to}&period=${period}`
      );
      if (!r1.ok) throw new Error(await r1.text());
      const j1 = await r1.json();
      series = j1.series ?? [];

      // 2) 기준일 종가 매칭: baseDate 이상인 첫 포인트(없으면 첫 포인트)
      const idx = series.findIndex((p: PricePoint) => p.date >= baseDate);
      const baseIdx = idx === -1 ? 0 : idx;
      baseClose = series[baseIdx]?.close ?? null;

      // 3) 현재가
      const r2 = await fetch(`/api/kis/quote?code=${selectedCode}`);
      if (!r2.ok) throw new Error(await r2.text());
      const j2 = await r2.json();
      currentPrice = j2.currentPrice ?? (series.at(-1)?.close ?? null);
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

<section class="page">
  <!-- ===== Hero -->
  <div class="hero">
    <div class="hero-inner">
      <div class="hero-title">
        <h1>
          주식 보유 현황 <span class="accent">메인 대시보드</span>
        </h1>
        <p>기준일 대비 흐름을 빠르게 확인하고, 종목별 차트를 직관적으로 조회하세요.</p>
      </div>

      <!-- Search Card -->
      <div class="card search">
        <div class="search-grid">
          <div class="field">
            <label>기준일</label>
            <div class="control">
              <input type="date" bind:value={baseDate} />
            </div>
          </div>

          <div class="field">
            <div class="row-between">
              <label>종목</label>
              <span class="hint-up">종목 선택 시 사용 가능</span>
            </div>
            <div class="control">
              <select bind:value={selectedCode}>
                {#each options as opt}
                  <option value={opt.code}>{opt.name}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn ghost" on:click={resetFilters} disabled={loading}>
              초기화
            </button>
            <button class="btn primary" on:click={fetchKis} disabled={loading}>
              {loading ? "조회 중..." : "조회"}
            </button>
          </div>
        </div>

        {#if errorMsg}
          <div class="alert">{errorMsg}</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- ===== Content -->
  <div class="container">
    <!-- KPI -->
    <div class="kpi-grid">
      <div class="card kpi">
        <div class="k-label">보유 종목</div>
        <div class="k-value">{holdingCount}</div>
        <div class="k-sub">현재 store 기준</div>
      </div>

      <div class="card kpi">
        <div class="k-label">선택 종목</div>
        <div class="k-value2">{selectedHolding ? selectedHolding.name : "전체"}</div>
        <div class="k-sub">{selectedHolding ? selectedHolding.code : "—"}</div>
      </div>

      <div class="card kpi">
        <div class="k-label">기준일 대비</div>
        <div class="k-value">
          {#if delta != null}
            <span class={delta >= 0 ? "pos" : "neg"}>
              {delta >= 0 ? "+" : ""}{delta.toLocaleString()}
            </span>
            <span class="pct">
              ({deltaPct != null ? (deltaPct >= 0 ? "+" : "") + deltaPct.toFixed(2) + "%" : ""})
            </span>
          {:else}
            <span class="dash">—</span>
          {/if}
        </div>
        <div class="k-sub">단일 종목 선택 시</div>
      </div>

      <div class="card kpi">
        <div class="k-label">평가금액(추정)</div>
        <div class="k-value">
          {#if estimatedValue != null}
            {estimatedValue.toLocaleString()}원
          {:else}
            <span class="dash">—</span>
          {/if}
        </div>
        <div class="k-sub">수량×현재가</div>
      </div>
    </div>

    <div class="main-grid">
      <!-- Holdings Table -->
      <div class="card table-card">
        <div class="table-head">
          <div>
            <div class="t1">보유 종목 리스트</div>
            <div class="t2">종목을 선택하면 우측에 차트가 활성화됩니다.</div>
          </div>
          <div class="pill">{baseDate}</div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>종목</th>
                <th>코드</th>
                <th class="right">수량</th>
                <th class="right">바로선택</th>
              </tr>
            </thead>
            <tbody>
              {#each holdingList as h (h.code)}
                <tr>
                  <td class="name">{h.name}</td>
                  <td class="code">{h.code}</td>
                  <td class="right nums">{h.qty}</td>
                  <td class="right">
                    <button
                      class="btn small primary"
                      on:click={() => {
                        selectedCode = h.code;
                        fetchKis();
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

        <div class="badges">
          <span class="badge">
            <span class="dot v"></span> 전체 선택 시 차트 비활성
          </span>
          <span class="badge">
            <span class="dot f"></span> 데모 데이터로 퍼블리싱 확인
          </span>
        </div>
      </div>

      <!-- Right: Chart + Summary -->
      <div class="right-col">
        <div class="card chart-card">
          <div class="chart-head">
            <div class="t1">가격 차트</div>

            {#if selectedCode !== "ALL" && baseClose != null && currentPrice != null}
              <div class="chart-meta">
                <span class="pill2">기준일 {baseDate}: {baseClose.toLocaleString()}원</span>
                <span class="pill2">현재가: {currentPrice.toLocaleString()}원</span>
              </div>
            {/if}
          </div>

          <div class="chart-body">
            {#if selectedCode === "ALL"}
              <div class="empty-box">
                <div class="e1">종목을 선택하세요</div>
                <div class="e2">
                  왼쪽 리스트에서 <b>선택</b> 버튼을 누르면 바로 조회됩니다.
                </div>
              </div>
            {:else}
              <!-- 차트만 횡하게 나오던 문제: 항상 카드 안에서 렌더링 -->
              <PriceChart {series} {baseDate} {baseClose} {currentPrice} />
            {/if}
          </div>
        </div>

        <div class="card summary">
          <div class="sum-head">
            <div class="t1">요약</div>
            <span class="mini">UI 퍼블리싱</span>
          </div>

          <div class="sum-grid">
            <div class="mini-card">
              <div class="m-label">기준가</div>
              <div class="m-value">
                {baseClose != null ? baseClose.toLocaleString() + "원" : "—"}
              </div>
            </div>

            <div class="mini-card">
              <div class="m-label">현재가</div>
              <div class="m-value">
                {currentPrice != null ? currentPrice.toLocaleString() + "원" : "—"}
              </div>
            </div>
          </div>

          <div class="note">
            ※ 실제 API 연동 시 `fetchDemo()`만 API 호출로 교체하면, 화면 구조는 그대로 유지됩니다.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* ===== page layout */
  .page {
    max-width: 1100px;
    margin: 0 auto;
  }

  /* ===== hero (토큰 기반) */
  .hero {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    margin-top: 8px;
    margin-bottom: 16px;
    border: 1px solid var(--border);
    background: var(--panel);
    box-shadow: var(--shadow);
  }

  .hero::before {
    content: "";
    position: absolute;
    inset: -2px;
    pointer-events: none;
    background-image:
      radial-gradient(900px circle at 15% 10%, rgba(168,85,247,0.24), transparent 55%),
      radial-gradient(800px circle at 80% 0%, rgba(99,102,241,0.20), transparent 50%),
      radial-gradient(900px circle at 50% 85%, rgba(236,72,153,0.14), transparent 55%);
    opacity: 1;
  }

  :global(html[data-theme="dark"]) .hero::before {
    background-image:
      radial-gradient(900px circle at 15% 10%, rgba(34,197,94,0.18), transparent 55%),
      radial-gradient(800px circle at 80% 0%, rgba(251,191,36,0.14), transparent 50%),
      radial-gradient(900px circle at 50% 85%, rgba(6,182,212,0.12), transparent 55%);
  }

  .hero-inner {
    position: relative;
    padding: 18px;
  }

  .hero-title h1 {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.02em;
    font-weight: 1000;
  }

  .hero-title p {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--muted);
  }

  .accent {
    margin-left: 8px;
    background: linear-gradient(90deg, var(--brand), rgba(168,85,247,0.95));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* ===== shared card */
  .card {
    border: 1px solid var(--border);
    background: var(--panel);
    border-radius: 18px;
    box-shadow: var(--shadow);
  }

  /* ===== Search */
  .search { padding: 14px; background: var(--panel2); }

  .search-grid{
    display:grid;
    grid-template-columns: 200px 1fr auto; /* ✅ 버튼은 auto로 */
    gap: 12px;
    align-items: end;
  }

  @media (max-width: 980px){
    .search-grid{ grid-template-columns: 1fr; align-items: stretch; }
  }

  .field label{
    display:block;
    font-size: 12px;
    color: var(--muted);
    font-weight: 800;
  }

  /* ✅ 입력/셀렉트는 margin-top 제거하고 control 래퍼에서 통일 */
  .control{ margin-top: 8px; }

  /* ✅ 공통 컨트롤 */
  input, select{
    width: 100%;
    height: 44px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.65);
    color: var(--text);
    padding: 0 12px;
    outline: none;
    margin: 0;
    box-sizing: border-box;

    /* ✅ 핵심: 셀렉트 기본 UI 정렬 이슈 방지 */
    line-height: 44px;
    font-size: 13px;
  }

  /* 다크 */
  :global(html[data-theme="dark"]) input,
  :global(html[data-theme="dark"]) select{
    background: rgba(2,6,23,0.35);
  }

  input:focus, select:focus{ box-shadow: var(--ring); }

  /* ✅ select만 추가 보정 */
  select{
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;

    /* 화살표 영역 확보 */
    padding-right: 44px;

    /* Windows/Chrome에서 높이 틀어짐 방지 */
    background-image:
      linear-gradient(45deg, transparent 50%, var(--muted) 50%),
      linear-gradient(135deg, var(--muted) 50%, transparent 50%);
    background-position:
      calc(100% - 18px) 18px,
      calc(100% - 12px) 18px;
    background-size: 6px 6px, 6px 6px;
    background-repeat: no-repeat;
  }

  /* ✅ iOS에서 라인하이트가 과하게 먹는 경우 대비 */
  @supports (-webkit-touch-callout: none) {
    select { line-height: normal; }
  }

  .row-between{
    display:flex;
    align-items:flex-end;
    justify-content:space-between;
    gap:12px;
  }

  .hint-up{
    font-size: 11px;
    color: var(--muted);
    transform: translateY(-2px);
    white-space: nowrap;
  }

  .btn-row{
    display:flex;
    gap:10px;
    justify-content:flex-end;
    align-self:end;           /* ✅ 라벨/필드 기준 하단 정렬 */
  }

  @media (max-width: 980px){
    .btn-row{ justify-content: stretch; }
    .btn-row .btn{ flex: 1; }
  }


  .btn {
    height: 44px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.55);
    color: var(--text);
    font-weight: 1000;
    padding: 0 14px;
    cursor: pointer;
    white-space: nowrap;
  }

  :global(html[data-theme="dark"]) .btn {
    background: rgba(2,6,23,0.30);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn.primary {
    border-color: rgba(37,99,235,0.25);
    background: rgba(37,99,235,0.14);
  }

  .btn.ghost {
    background: transparent;
  }

  .btn.small {
    height: 34px;
    border-radius: 12px;
    padding: 0 12px;
    font-size: 12px;
  }

  .alert {
    margin-top: 12px;
    border: 1px solid rgba(239,68,68,0.25);
    background: rgba(239,68,68,0.08);
    color: #ef4444;
    padding: 10px 12px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 800;
  }

  /* ===== container */
  .container {
    padding: 0;
  }

  /* ===== KPI */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin: 14px 0 14px;
  }

  @media (max-width: 980px) {
    .kpi-grid { grid-template-columns: 1fr; }
  }

  .kpi {
    padding: 14px;
    background: var(--panel2);
  }

  .k-label {
    font-size: 12px;
    color: var(--muted);
    font-weight: 800;
  }

  .k-value {
    margin-top: 10px;
    font-size: 22px;
    font-weight: 1100;
    letter-spacing: -0.02em;
  }

  .k-value2 {
    margin-top: 10px;
    font-size: 16px;
    font-weight: 1100;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .k-sub {
    margin-top: 6px;
    font-size: 12px;
    color: var(--muted);
  }

  .pos { color: #22c55e; }
  .neg { color: #ef4444; }
  .pct {
    margin-left: 8px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 1000;
  }
  .dash { color: var(--muted); }

  /* ===== main grid */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr; /* ✅ 50:50 */
    gap: 14px;
    align-items: start;
  }

  @media (max-width: 980px) {
    .main-grid { grid-template-columns: 1fr; }
  }

  .table-card {
    padding: 14px;
    background: var(--panel2);
  }

  .table-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .t1 {
    font-size: 14px;
    font-weight: 1100;
    letter-spacing: -0.02em;
  }

  .t2 {
    margin-top: 6px;
    font-size: 12px;
    color: var(--muted);
  }

  .pill {
    font-size: 12px;
    color: var(--muted);
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 8px 12px;
    border-radius: 999px;
    font-weight: 1000;
    white-space: nowrap;
  }

  .table-wrap {
    margin-top: 12px;
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    background: var(--panel);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  thead {
    background: rgba(255,255,255,0.45);
  }
  :global(html[data-theme="dark"]) thead {
    background: rgba(2,6,23,0.25);
  }

  th, td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }

  tbody tr:hover {
    background: rgba(37,99,235,0.06);
  }
  :global(html[data-theme="dark"]) tbody tr:hover {
    background: rgba(96,165,250,0.10);
  }

  .right { text-align: right; }
  .nums { font-variant-numeric: tabular-nums; }
  .name { font-weight: 1000; }
  .code { color: var(--muted); }

  .badges {
    margin-top: 12px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 7px 10px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 900;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }
  .dot.v { background: rgba(168,85,247,0.9); }
  .dot.f { background: rgba(236,72,153,0.85); }

  /* ===== right column */
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .empty-box {
    margin-top: 12px;
    border: 1px dashed var(--border);
    border-radius: 18px;
    padding: 16px;
    text-align: center;
    background: rgba(255,255,255,0.35);
  }
  :global(html[data-theme="dark"]) .empty-box {
    background: rgba(2,6,23,0.20);
  }

  .e1 { font-weight: 1100; font-size: 16px; }
  .e2 { margin-top: 8px; font-size: 12px; color: var(--muted); line-height: 1.45; }

  .summary {
    padding: 14px;
    background: var(--panel2);
  }

  .sum-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .mini {
    font-size: 12px;
    color: var(--muted);
    font-weight: 900;
  }

  .sum-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .mini-card {
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--panel);
    padding: 12px;
  }

  .m-label {
    font-size: 11px;
    color: var(--muted);
    font-weight: 900;
  }

  .m-value {
    margin-top: 8px;
    font-size: 16px;
    font-weight: 1100;
    letter-spacing: -0.02em;
  }

  .note {
    margin-top: 12px;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.45;
  }

  /* ===== Chart Card */
  .chart-card{
    padding: 14px;
    background: var(--panel2);
  }

  .chart-head{
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap: 10px;
  }

  .chart-meta{
    display:flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .pill2{
    font-size: 12px;
    color: var(--muted);
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 7px 10px;
    border-radius: 999px;
    font-weight: 900;
    white-space: nowrap;
  }

  .chart-body{
    margin-top: 12px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--panel);
    overflow: hidden; /* ✅ 차트가 밖으로 튀는 것 방지 */
    padding: 12px;    /* ✅ PriceChart가 단독 렌더여도 카드 안에서 보기 좋게 */
  }

  .empty-box{
    border: 1px dashed var(--border);
    border-radius: 16px;
    padding: 16px;
    text-align: center;
    background: rgba(255,255,255,0.35);
  }
  :global(html[data-theme="dark"]) .empty-box{ background: rgba(2,6,23,0.20); }

</style>
