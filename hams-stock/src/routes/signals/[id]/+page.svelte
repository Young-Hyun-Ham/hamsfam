<!-- src/routes/signals/[id]/+page.svelte -->
<script lang="ts">
  import { onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { user } from "$lib/stores/user";
  import { db } from "$lib/firebase/client";
  import { doc, onSnapshot } from "firebase/firestore";
  import { goto } from "$app/navigation";

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

  // transcript는 문자열/배열 모두 대응
  function normalizeTranscript(t: any): string {
    if (!t) return "";
    if (Array.isArray(t)) return t.filter(Boolean).join("\n");
    if (typeof t === "string") return t;
    return String(t);
  }

  const PREVIEW_CHARS = 200;

  let loading = true;
  let notFound = false;
  let errorMsg = "";
  let s: any = null;

  let transcriptOpen = false;

  // ✅ store 값은 반응형으로 받기
  $: sid = $page.params.id; // string
  $: uid = $user.uid;       // string

  $: transcriptText = normalizeTranscript(s?.transcript);
  $: transcriptPreview =
    transcriptText.length > PREVIEW_CHARS
      ? transcriptText.slice(0, PREVIEW_CHARS) + "…"
      : transcriptText;
  $: isTranscriptLong = transcriptText.length > PREVIEW_CHARS;

  $: stocks = Array.isArray(s?.stocks) ? s.stocks : [];
  $: topStocks = stocks.slice(0, 3);

  // ✅ transcript 존재 여부/길이에 따라 기본 접힘 상태 자동 정리
  $: if (!transcriptText) {
    transcriptOpen = false;
  }

  function toggleTranscript(e: MouseEvent) {
    // ✅ 클릭이 다른 요소로 전파되며 막히는 케이스 방지
    e.preventDefault();
    e.stopPropagation();
    transcriptOpen = !transcriptOpen;
  }

  function goBackList() {
    goto("/signals");
  }

  let unsub: null | (() => void) = null;

  // ✅ sid가 바뀌거나(라우팅) 처음 들어올 때마다 구독 재설정
  $: if (sid) {
    unsub?.();

    loading = true;
    errorMsg = "";
    notFound = false;
    s = null;

    const ref = doc(db, "signals", sid);

    unsub = onSnapshot(
      ref,
      (snap) => {
        loading = false;

        if (!snap.exists()) {
          notFound = true;
          s = null;
          return;
        }

        const data = snap.data();

        // ✅ auth 전: demo uid만 보게 최소 가드
        if (data?.uid && data.uid !== uid) {
          notFound = true;
          s = null;
          return;
        }

        s = { id: snap.id, ...data };
      },
      (err) => {
        loading = false;
        errorMsg = err?.message ?? String(err);
      }
    );
  }

  onDestroy(() => unsub?.());
</script>

<section class="wrap">
  {#if loading}
    <div class="state">불러오는 중...</div>

  {:else if errorMsg}
    <div class="state err">오류: {errorMsg}</div>

  {:else if notFound}
    <div class="state">문서를 찾을 수 없어요.</div>

  {:else}
    <div class="head">
      <div class="titlebox">
        <!-- ✅ 리스트로 돌아가기 버튼 -->
        <div class="toprow">
          <button class="back" type="button" on:click={goBackList} aria-label="리스트로 돌아가기">
            ← 목록
          </button>

          <div class="meta">
            <span class="badge">{s.status ?? "queued"}</span>
            {#if s.createdAt}
              <span class="dot">•</span>
              <span class="time">{tsToText(s.createdAt)}</span>
            {/if}
          </div>
        </div>

        <h1 class="h1">{s.videoTitle ?? "영상 상세"}</h1>
      </div>

      <div class="actions">
        {#if s.videoUrl}
          <a class="btn" href={s.videoUrl} target="_blank" rel="noreferrer">
            영상 열기
          </a>
        {/if}
      </div>
    </div>

    <!-- ✅ 종목(1~3개) : 칩 + 근거 요약 -->
    <div class="card">
      <div class="card-title">
        종목 / 근거
        {#if stocks.length > 3}
          <span class="mini">(+{stocks.length - 3}개 더 있음)</span>
        {/if}
      </div>

      {#if topStocks.length}
        <div class="chips">
          {#each topStocks as st (st.code ?? st.name)}
            <div class="chip">
              <div class="chip-k">
                {st.code ? st.code : ""}{st.name ? ` ${st.name}` : ""}
              </div>
              {#if st.reason}
                <div class="chip-r">{st.reason}</div>
              {:else}
                <div class="chip-r muted">근거가 아직 없어요.</div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="hint">
          아직 종목 분석 결과가 없어. (워커가 ai_done 되면 자동 표시)
        </div>
      {/if}
    </div>

    <!-- ✅ transcript 접기/펼치기 -->
    <div class="card">
      <div class="row-between">
        <div class="card-title">Transcript</div>

        {#if transcriptText}
          <div class="tctl">
            {#if isTranscriptLong}
              <span class="tmsg">
                {transcriptOpen ? "전체 표시 중" : `미리보기(${PREVIEW_CHARS.toLocaleString()}자)` }
              </span>
              <button class="pill" type="button" on:click={toggleTranscript}>
                {transcriptOpen ? "접기" : "펼치기"}
              </button>
            {:else}
              <span class="tmsg">전체 스트립트 내용이 짧아서 전체 표시 중</span>
            {/if}
          </div>
        {/if}
      </div>

      {#if !transcriptText}
        <div class="hint">아직 STT가 완료되지 않았어. (status=stt_done 후 저장)</div>
      {:else}
        <pre class="transcript">{transcriptOpen ? transcriptText : transcriptPreview}</pre>
      {/if}
    </div>

    <!-- 추가 정보 -->
    <div class="foot">
      {#if s.videoUrl}
        <div class="kv">
          <div class="k">영상 링크</div>
          <a class="v link" href={s.videoUrl} target="_blank" rel="noreferrer">{s.videoUrl}</a>
        </div>
      {/if}

      {#if s.publishedAt}
        <div class="kv">
          <div class="k">업로드</div>
          <div class="v">{tsToText(s.publishedAt)}</div>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .wrap{ max-width:1100px; margin:0 auto; padding: 0 14px; }
  .state{
    border:1px dashed var(--border);
    border-radius:18px;
    background:var(--panel);
    padding:18px;
    color:var(--muted);
    font-size:13px;
  }
  .state.err{ color:#ef4444; border-color: rgba(239,68,68,0.3); }

  .head{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:12px;
    margin: 16px 0 12px;
  }

  .toprow{
    display:flex;
    align-items:center;
    gap:10px;
    margin-bottom:10px;
    flex-wrap:wrap;
  }

  .back{
    height:40px;
    padding:0 12px;
    border-radius:999px;
    border:1px solid var(--border);
    background:transparent;
    color:var(--text);
    font-weight:1000;
    cursor:pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .back:active{ transform: translateY(0.5px); }
  .back:focus-visible{
    outline:2px solid rgba(59,130,246,0.55);
    outline-offset:3px;
  }

  .h1{ margin:0; font-size:18px; font-weight:1000; letter-spacing:-0.02em; }
  .meta{ display:flex; align-items:center; gap:8px; color:var(--muted); font-size:12px; }
  .badge{
    font-size:11px; font-weight:1000;
    border:1px solid var(--border);
    background:var(--panel2);
    padding:6px 10px; border-radius:999px;
  }
  .dot,.time{ color:var(--muted); }

  .actions{ display:flex; gap:10px; }
  .btn{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    height:44px;
    padding:0 14px;
    border-radius:14px;
    border:1px solid var(--border);
    background:var(--panel2);
    text-decoration:none;
    color:var(--text);
    font-weight:1000;
    white-space:nowrap;
  }

  .card{
    border:1px solid var(--border);
    border-radius:20px;
    background:var(--panel);
    box-shadow: var(--shadow);
    padding:14px;
    margin-top:12px;
  }
  .card-title{ font-size:13px; font-weight:1000; }
  .mini{ margin-left:8px; font-size:12px; color:var(--muted); font-weight:900; }

  .chips{
    margin-top:12px;
    display:flex;
    flex-direction:column;
    gap:10px;
  }
  .chip{
    border:1px solid var(--border);
    background:var(--panel2);
    border-radius:18px;
    padding:12px;
    min-height:64px;
  }
  .chip-k{ font-size:13px; font-weight:1000; }
  .chip-r{ margin-top:8px; font-size:12px; line-height:1.45; color:var(--muted); white-space:pre-wrap; }
  .chip-r.muted{ opacity:0.85; }

  .row-between{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .pill{
    height:40px;
    padding:0 12px;
    border-radius:999px;
    border:1px solid var(--border);
    background:transparent;
    color:var(--text);
    font-weight:1000;
    cursor:pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .pill:active{ transform: translateY(0.5px); }

  .transcript{
    margin-top:12px;
    border:1px solid var(--border);
    background: rgba(0,0,0,0.02);
    border-radius:16px;
    padding:12px;
    font-size:12px;
    line-height:1.55;
    white-space:pre-wrap;
    word-break:break-word;
  }

  .hint{ margin-top:12px; font-size:12px; color:var(--muted); }

  .foot{
    margin-top:12px;
    border-top:1px solid var(--border);
    padding-top:12px;
    color:var(--muted);
    display:flex;
    flex-direction:column;
    gap:10px;
    font-size:12px;
  }
  .kv{ display:flex; gap:10px; align-items:flex-start; }
  .k{ width:64px; flex:0 0 64px; }
  .v{ flex:1; min-width:0; }
  .link{ color:var(--muted); word-break:break-all; text-decoration:none; }
  .link:hover{ color:var(--text); text-decoration:underline; }
</style>
