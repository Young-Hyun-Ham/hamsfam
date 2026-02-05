<!-- src/lib/components/SignalCard.svelte -->
<script lang="ts">
  export let s: any;

  function tsToText(v: any) {
    try {
      const d = v?.toDate?.() ? v.toDate() : (v instanceof Date ? v : null);
      if (!d) return "";
      return new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    } catch {
      return "";
    }
  }
</script>

<article class="card">
  <div class="top">
    <div class="title">{s.videoTitle ?? "제목 없음"}</div>
    <div class="status">{s.status ?? "queued"}</div>
  </div>

  <div class="sub">
    <a class="link" href={s.videoUrl} target="_blank" rel="noreferrer">
      {s.videoUrl ?? ""}
    </a>
    {#if s.publishedAt}
      <span class="dot">•</span>
      <span class="time">{tsToText(s.publishedAt)}</span>
    {/if}
  </div>

  {#if s.stocks?.length}
    <div class="stocks">
      {#each s.stocks as st}
        <div class="stock">
          <div class="k">{st.code} {st.name}</div>
          <div class="r">{st.reason}</div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="hint">아직 분석 결과가 없어. (워커가 stt/ai 완료하면 자동 표시)</div>
  {/if}
</article>

<style>
  .card{
    border: 1px solid var(--border);
    border-radius: 18px;
    background: var(--panel);
    box-shadow: var(--shadow);
    padding: 14px;
  }
  .top{ display:flex; justify-content: space-between; gap: 10px; }
  .title{ font-weight: 1000; letter-spacing: -0.02em; }
  .status{
    font-size: 11px;
    font-weight: 1000;
    color: var(--muted);
    border: 1px solid var(--border);
    background: var(--panel2);
    padding: 5px 10px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .sub{ margin-top: 8px; display:flex; flex-wrap: wrap; align-items:center; gap: 8px; }
  .link{ color: var(--muted); text-decoration: none; font-size: 12px; word-break: break-all; }
  .link:hover{ color: var(--text); text-decoration: underline; }
  .dot, .time{ color: var(--muted); font-size: 12px; }

  .stocks{ margin-top: 12px; display:flex; flex-direction: column; gap: 10px; }
  .stock{
    border: 1px solid var(--border);
    background: var(--panel2);
    border-radius: 16px;
    padding: 10px;
  }
  .k{ font-weight: 1000; font-size: 13px; }
  .r{ margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.45; }
  .hint{ margin-top: 12px; color: var(--muted); font-size: 12px; }
</style>
