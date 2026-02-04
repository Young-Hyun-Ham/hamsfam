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
  };

  type Row = {
    id: string;
    url: string;
    enabled: boolean;
    loading: boolean;
    error: string;
    subscribeInfo?: { channelId: string; topic: string; callback: string } | null;
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
    { id: uid(), url: "", enabled: false, loading: false, error: "", subscribeInfo: null, result: null },
  ];

  function addRow() {
    rows = [...rows, { id: uid(), url: "", enabled: false, loading: false, error: "", subscribeInfo: null, result: null }];
  }

  function removeRow(id: string) {
    if (rows.length === 1) return;
    rows = rows.filter((r) => r.id !== id);
  }

  async function subscribeChannel(rowId: string) {
    const r = rows.find((x) => x.id === rowId);
    if (!r) return;

    const channelUrl = r.url.trim();
    if (!isProbablyYoutubeUrl(channelUrl)) {
      rows = rows.map((x) => (x.id === rowId ? { ...x, error: "유튜브 채널/핸들 주소를 입력해줘." } : x));
      return;
    }

    rows = rows.map((x) => (x.id === rowId ? { ...x, loading: true, error: "" } : x));

    try {
      const res = await fetch("/api/youtube/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "구독 등록 실패");

      rows = rows.map((x) =>
        x.id === rowId
          ? {
              ...x,
              loading: false,
              enabled: true,
              subscribeInfo: { channelId: j.channelId, topic: j.topic, callback: j.callback },
            }
          : x
      );
    } catch (e: any) {
      rows = rows.map((x) =>
        x.id === rowId ? { ...x, loading: false, enabled: false, subscribeInfo: null, error: e?.message ?? "구독 실패" } : x
      );
    }
  }

  async function unsubscribeChannel(rowId: string) {
    // ⚠️ WebSub "unsubscribe"도 가능하지만(동일 hub.mode=unsubscribe),
    // 초기 단계에서는 UI상 OFF만 처리하고, 필요하면 unsubscribe API도 추가하면 됨.
    rows = rows.map((x) => (x.id === rowId ? { ...x, enabled: false, result: null } : x));
  }

  async function runAnalyzePreview(rowId: string) {
    const r = rows.find((x) => x.id === rowId);
    if (!r) return;
    const url = r.url.trim();
    if (!isProbablyYoutubeUrl(url)) return;

    rows = rows.map((x) => (x.id === rowId ? { ...x, loading: true, error: "", result: null } : x));

    try {
      const res = await fetch(`/api/youtube/picks?channelUrl=${encodeURIComponent(url)}`);
      const data = (await res.json()) as AnalysisResult;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "분석 실패");

      rows = rows.map((x) => (x.id === rowId ? { ...x, loading: false, result: data } : x));
    } catch (e: any) {
      rows = rows.map((x) => (x.id === rowId ? { ...x, loading: false, error: e?.message ?? "분석 실패" } : x));
    }
  }

  async function toggleNotify(rowId: string) {
    const r = rows.find((x) => x.id === rowId);
    if (!r) return;

    if (!r.enabled) {
      // ✅ ON: WebSub 구독 등록부터
      await subscribeChannel(rowId);

      // (선택) UX: 구독 직후 1회 미리보기 분석
      // await runAnalyzePreview(rowId);
    } else {
      // OFF
      await unsubscribeChannel(rowId);
    }
  }
</script>

<div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <div class="mx-auto w-full max-w-5xl px-4 py-10">
    <div class="text-2xl font-black tracking-tight">유튜버 알림 → 업로드 감지 → 텔레그램 전송</div>
    <div class="mt-2 text-sm text-slate-600 dark:text-slate-300">
      알림을 켜면 WebSub(유튜브 푸시)로 새 영상 업로드 이벤트가 서버로 들어오고, 백엔드에서 분석 후 텔레그램으로 메시지를 보냅니다.
    </div>

    <div class="mt-8 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm font-semibold">유튜버 목록</div>
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
                    rows = rows.map((x) => (x.id === r.id ? { ...x, error: "", subscribeInfo: null, result: null } : x));
                  }}
                />
              </div>

              <div class="flex items-center gap-2">
                <button
                  class={`h-11 min-w-[120px] rounded-2xl px-4 text-sm font-bold shadow-sm transition
                    ${
                      r.enabled
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    }`}
                  on:click={() => toggleNotify(r.id)}
                  disabled={r.loading}
                >
                  {#if r.enabled}알림 해제{:else}알림{/if}
                </button>

                <button
                  class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold
                         hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  on:click={() => runAnalyzePreview(r.id)}
                  disabled={r.loading || !r.enabled}
                  title="알림이 켜진 상태에서만 미리보기 분석"
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

            {#if r.subscribeInfo}
              <div class="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                <div><b>구독 요청 완료</b> (Hub가 곧 callback 검증을 시도함)</div>
                <div class="mt-1">channelId: {r.subscribeInfo.channelId}</div>
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
