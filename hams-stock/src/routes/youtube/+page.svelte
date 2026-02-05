<!-- src/routes/youtube/+page.svelte -->
<script lang="ts">
  type Pick = {
    market: "KOSPI" | "KOSDAQ";
    code: string;
    name: string;
    reason: string;
    confidence?: number;
  };

  type AnalysisResult = {
    ok: boolean;
    checkedAt: string;
    channelUrl: string;
    latestVideo?: { title: string; url: string; publishedAt: string };
    picks?: Pick[];
    error?: string;
    warning?: any;
  };

  type Row = {
    id: string;
    url: string;

    /** ✅ "유튜브 구독"이 아니라 "업로드 감지 파이프라인 ON/OFF" */
    enabled: boolean;

    loading: boolean;
    error: string;

    /** ✅ WebSub 등록 정보(표현도 '모니터링 등록') */
    monitorInfo?: { channelId: string; topic: string; callback: string } | null;

    /** ✅ 미리보기(최신 영상 자막→AI→TopPick) */
    result: AnalysisResult | null;
  };

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function isProbablyYoutubeUrl(v: string) {
    const s = v.trim();
    return !!s && /youtube\.com|youtu\.be/i.test(s);
  }

  let rows: Row[] = [
    { id: uid(), url: "", enabled: false, loading: false, error: "", monitorInfo: null, result: null },
  ];

  function addRow() {
    rows = [
      ...rows,
      { id: uid(), url: "", enabled: false, loading: false, error: "", monitorInfo: null, result: null },
    ];
  }

  function removeRow(id: string) {
    if (rows.length === 1) return;
    rows = rows.filter((r) => r.id !== id);
  }

  /** ✅ ON: WebSub 구독 등록 = "업로드 감지 파이프라인 활성화" */
  async function enableMonitor(rowId: string) {
    const r = rows.find((x) => x.id === rowId);
    if (!r) return;

    const channelUrl = r.url.trim();
    if (!isProbablyYoutubeUrl(channelUrl)) {
      rows = rows.map((x) =>
        x.id === rowId ? { ...x, error: "유튜브 채널/핸들 주소를 입력해줘." } : x
      );
      return;
    }

    rows = rows.map((x) => (x.id === rowId ? { ...x, loading: true, error: "" } : x));

    try {
      // ✅ 서버에서 WebSub 구독 등록(= 업로드 푸시 이벤트 수신 준비)
      const res = await fetch("/api/youtube/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "모니터링 등록 실패");

      rows = rows.map((x) =>
        x.id === rowId
          ? {
              ...x,
              loading: false,
              enabled: true,
              monitorInfo: { channelId: j.channelId, topic: j.topic, callback: j.callback },
            }
          : x
      );
    } catch (e: any) {
      rows = rows.map((x) =>
        x.id === rowId
          ? { ...x, loading: false, enabled: false, monitorInfo: null, error: e?.message ?? "등록 실패" }
          : x
      );
    }
  }

  /** ✅ OFF: 현 단계에서는 UI상 OFF만(필요하면 hub.mode=unsubscribe API 추가) */
  async function disableMonitor(rowId: string) {
    rows = rows.map((x) => (x.id === rowId ? { ...x, enabled: false, result: null } : x));
  }

  /** ✅ 미리보기: "최신 영상" 기준 자막→AI 검증→TopPick */
  async function runAnalyzePreview(rowId: string) {
    const r = rows.find((x) => x.id === rowId);
    if (!r) return;

    const url = r.url.trim();
    if (!isProbablyYoutubeUrl(url)) {
      rows = rows.map((x) =>
        x.id === rowId ? { ...x, error: "미리보기를 하려면 유튜브 채널/핸들 주소를 입력해줘.", result: null } : x
      );
      return;
    }

    rows = rows.map((x) => (x.id === rowId ? { ...x, loading: true, error: "", result: null } : x));

    try {
      const res = await fetch(`/api/youtube/picks?channelUrl=${encodeURIComponent(url)}&notify=1`);
      const data = (await res.json()) as AnalysisResult;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "미리보기 분석 실패");

      rows = rows.map((x) => (x.id === rowId ? { ...x, loading: false, result: data } : x));
    } catch (e: any) {
      rows = rows.map((x) => (x.id === rowId ? { ...x, loading: false, error: e?.message ?? "분석 실패" } : x));
    }
  }

  /** ✅ 버튼 의미 교정: 알림(ON/OFF) = 업로드 감지 파이프라인 ON/OFF */
  async function toggleNotify(rowId: string) {
    const r = rows.find((x) => x.id === rowId);
    if (!r) return;

    if (!r.enabled) {
      await enableMonitor(rowId);
      // 필요하면 ON 직후 1회 미리보기 자동 실행도 가능
      // await runAnalyzePreview(rowId);
    } else {
      await disableMonitor(rowId);
    }
  }
</script>

<div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <div class="mx-auto w-full max-w-5xl px-4 py-10">
    <div class="text-2xl font-black tracking-tight">
      업로드 감지 → 자막 추출 → AI 검증 → 텔레그램 Top Pick 전송
    </div>

    <div class="mt-2 text-sm text-slate-600 dark:text-slate-300">
      새 영상이 올라오면 <b>자막(스크립트) 추출</b> → <b>AI 검증</b> 후
      <b>Top Pick 1~3 종목</b>을 근거와 함께 <b>텔레그램</b>으로 전송한다.
    </div>

    <div class="mt-8 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm font-semibold">모니터링 대상(유튜버) 목록</div>
        <button
          class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95 dark:bg-white dark:text-slate-900"
          on:click={addRow}
        >
          + 추가
        </button>
      </div>

      <div class="mt-4 space-y-3">
        {#each rows as r (r.id)}
          <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/30">
            <div class="flex flex-col gap-3 md:flex-row md:items-center">
              <div class="flex-1">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">유튜버 주소</div>
                <input
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none
                         focus:ring-2 focus:ring-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-slate-700"
                  placeholder="예) https://www.youtube.com/@channelhandle"
                  bind:value={r.url}
                  on:input={() => {
                    rows = rows.map((x) =>
                      x.id === r.id ? { ...x, error: "", monitorInfo: null, result: null } : x
                    );
                  }}
                />
              </div>

              <div class="flex items-center gap-2">
                <button
                  class={`h-11 min-w-[140px] rounded-2xl px-4 text-sm font-bold shadow-sm transition
                    ${
                      r.enabled
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    }`}
                  on:click={() => toggleNotify(r.id)}
                  disabled={r.loading}
                >
                  {#if r.enabled}감지 OFF{:else}감지 ON{/if}
                </button>

                <button
                  class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold
                        hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  on:click={() => runAnalyzePreview(r.id)}
                  disabled={r.loading || !r.url.trim()}
                  title="단발성 미리보기: 최신 영상 자막/설명 → AI 검증 → TopPick 1~3"
                >
                  미리보기
                </button>

                <button
                  class="h-11 rounded-2xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  on:click={() => removeRow(r.id)}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            </div>

            {#if r.loading}
              <div class="mt-3 text-sm text-slate-600 dark:text-slate-300">처리 중…</div>
            {/if}

            {#if r.error}
              <div class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700
                          dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                {r.error}
              </div>
            {/if}

            {#if r.monitorInfo}
              <div class="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                <div><b>모니터링 등록 완료</b> (Hub가 곧 callback 검증을 시도함)</div>
                <div class="mt-1">channelId: {r.monitorInfo.channelId}</div>
              </div>
            {/if}

            {#if r.result?.warning}
              <div
                class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800
                      dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
              >
                <div class="font-bold">참고</div>
                <div class="mt-1">{r.result.warning}</div>
              </div>
            {/if}

            {#if r.result?.picks?.length}
              <div class="mt-4">
                <div class="text-sm font-semibold">미리보기 Top Pick</div>
                <div class="mt-2 grid gap-3 md:grid-cols-3">
                  {#each r.result.picks as p (p.code)}
                    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                      <div class="text-xs font-bold text-slate-500 dark:text-slate-400">{p.market}</div>
                      <div class="mt-1 text-base font-black">{p.name}</div>
                      <div class="text-sm font-semibold text-slate-600 dark:text-slate-300">{p.code}</div>
                      <div class="mt-2 text-sm text-slate-700 dark:text-slate-200">{p.reason}</div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
