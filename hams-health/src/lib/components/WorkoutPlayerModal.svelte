<!-- src/lib/components/WorkoutPlayerModal.svelte -->
<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { onDestroy, tick } from "svelte";

  // ✅ 엔진/화면 공통 step 형태에 최대한 맞춤 (+ key는 UI용)
  type RoutineStep = {
    key: string;          // UI list key
    id?: string;          // reco.data.ts SUBTYPES_STEPS의 id (있으면 좋음)
    title: string;
    seconds: number;
    imgSrc: string;
    phase?: "warmup" | "main" | "finisher" | "cooldown";
  };

  type Warning =
    | string
    | {
        tag: string;
        text: string;
      };

  export let open = false;
  export let title = "추천 루틴";
  export let steps: RoutineStep[] = [];

  // ✅ 엔진 warnings 호환: string[] | {tag,text}[]
  export let warnings: Warning[] = [];

  export let onClose: () => void;

  let idx = 0;
  let remaining = 0;
  let total = 0;
  let totalRemaining = 0;

  let timer: any = null;
  let finished = false;
  let paused = false;
  
  let countdown = 0;               // 3,2,1
  let countdownTimer: any = null;  // setInterval 핸들
  let countdownArmed = false;      // 카운트다운 중 UI 잠금 용도(선택)

  let unlockBodyScroll: null | (() => void) = null;

  let listEl: HTMLOListElement | null = null;
  let itemEls: Array<HTMLLIElement | null> = [];

  // ✅ idx가 변할 때만 스크롤
  let lastScrollIdx = -1;

  function registerItem(i: number) {
    return (node: HTMLLIElement | null) => {
      if (node) itemEls[i] = node;
      return {
        destroy() {
          if (itemEls[i] === node) itemEls[i] = null;
        },
      };
    };
  }

  async function scrollActiveIntoView() {
    if (!open) return;
    await tick();

    requestAnimationFrame(() => {
      const el = itemEls[idx];
      if (!el) return;

      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });

      el.focus({ preventScroll: true });
    });
  }

  $: total = steps.reduce((a, b) => a + (b.seconds ?? 0), 0);
  $: current = steps[idx];

  function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function clearTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function lockScroll() {
    const body = document.body;
    const scrollY = window.scrollY;

    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }
  
  function clearCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdown = 0;
    countdownArmed = false;
  }

  function beginCountdown(thenRun: () => void) {
    // 기존 러닝 타이머는 멈춤(점프/재개 시 중복 방지)
    clearTimer?.();
    clearCountdown();

    countdownArmed = true;
    countdown = 3;

    // 즉시 READY 3 보여주고 1초마다 감소
    countdownTimer = setInterval(() => {
      countdown -= 1;

      if (countdown <= 0) {
        clearCountdown();
        thenRun();
      }
    }, 1000);
  }

  function reset() {
    idx = 0;
    remaining = steps[0]?.seconds ?? 0;
    totalRemaining = total;
    finished = false;
    paused = true;
    clearTimer();
  }

  function start(isContinue: boolean) {
    clearTimer();
    paused = false;

    timer = setInterval(() => {
      if (finished) return;

      if (remaining > 0) remaining -= 1;
      if (totalRemaining > 0) totalRemaining -= 1;

      if (remaining <= 0) {
        if (idx < steps.length - 1) {
          idx += 1;
          remaining = steps[idx].seconds;

          // 연속 모드가 아니면 다음 스텝 전환 시 자동 정지
          if (!isContinue) {
            paused = true;
            clearTimer();
          }
        } else {
          finished = true;
          clearTimer();
        }
      }
    }, 1000);
  }

  function pause() {
    paused = true;
    clearTimer();
  }

  function resume(isContinue: boolean = false) {
    if (!finished) start(isContinue);
  }

  function sumFrom(startIndex: number) {
    return steps.slice(startIndex).reduce((a, b) => a + (b?.seconds ?? 0), 0);
  }

  function jumpTo(targetIndex: number, autoContinue: boolean = true) {
    if (!steps?.length) return;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    // 점프 준비: 상태 세팅
    finished = false;
    idx = targetIndex;
    remaining = steps[idx]?.seconds ?? 0;
    totalRemaining = sumFrom(idx);
    paused = false; // 점프는 "실행 의도"이므로 paused 해제

    // 3초 READY → 실행
    beginCountdown(() => {
      start(autoContinue);
    });
  }

  function restart() {
    reset();
    lastScrollIdx = -1;
    scrollActiveIntoView();
  }

  function close() {
    // clearTimer();
    // unlockBodyScroll?.();
    // unlockBodyScroll = null;
    // onClose?.();
    clearCountdown();
    clearTimer();
    onClose?.();
  }

  function togglePlayFromImage() {
    if (finished) {
      restart();
      return;
    }
    if (paused) resume(false);
    else pause();
  }

  function warningText(w: Warning) {
    return typeof w === "string" ? w : w.text;
  }

  // ✅ open/close 처리
  $: if (open) {
    if (!unlockBodyScroll && typeof window !== "undefined") {
      unlockBodyScroll = lockScroll();
    }

    if (steps.length) {
      // steps 변경에 대응 (길이 맞춰 refs 초기화)
      itemEls = new Array(steps.length).fill(null);

      // 초기 상태
      reset();
      lastScrollIdx = -1;
      scrollActiveIntoView();
    } else {
      // steps가 없으면 안전하게 초기화만
      clearTimer();
      idx = 0;
      remaining = 0;
      totalRemaining = 0;
      finished = false;
      paused = true;
      lastScrollIdx = -1;
    }
  } else {
    clearTimer();
    unlockBodyScroll?.();
    unlockBodyScroll = null;
    lastScrollIdx = -1;
  }

  // ✅ idx 변할 때만 스크롤
  $: if (open && steps.length) {
    if (idx !== lastScrollIdx) {
      lastScrollIdx = idx;
      scrollActiveIntoView();
    }
  }

  onDestroy(() => {
    // clearTimer();
    // unlockBodyScroll?.();
    clearCountdown();
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
  function onBackdrop(e: MouseEvent) {
    // 모달 팝업 외 다른 영역 선택 시 닫기
    // if (e.currentTarget === e.target) close();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[80] bg-black/55"
    on:click={onBackdrop}
    on:keydown={onKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="0"
    transition:fade={{ duration: 120 }}
  >
    {#if countdown > 0}
      <div class="absolute inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
        <div class="text-center">
          <div class="text-2xl font-extrabold text-white">READY</div>
          <div class="mt-2 text-6xl font-black text-white tabular-nums">{countdown}</div>
          <div class="mt-3 text-sm text-white/80">곧 시작합니다</div>
        </div>
      </div>
    {/if}

    <div
      class="mx-auto flex h-[100dvh] w-full max-w-xl flex-col
             px-3 pt-[calc(env(safe-area-inset-top)+12px)]
             pb-[calc(env(safe-area-inset-bottom)+12px)]"
      style="--footer-h: 92px;"
    >
      <div
        class="flex h-full flex-col overflow-hidden rounded-3xl
          border border-black/10 bg-white text-zinc-900
          shadow-[0_20px_80px_rgba(0,0,0,0.18)]
          dark:border-black/10 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
        transition:fly={{ y: 10, duration: 160 }}
      >
        <!-- HEADER -->
        <div class="shrink-0 border-b border-black/10 dark:border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-extrabold">{title}</div>
              <div class="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                전체 남은 시간 <span class="font-bold">{fmt(totalRemaining)}</span>
                · 현재: <span class="font-bold">{current?.title ?? "-"}</span>
              </div>
            </div>

            <button
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl
                     border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-white/10"
              on:click={close}
              aria-label="닫기"
              title="닫기"
            >
              ✕
            </button>
          </div>

          <div class="mt-3 h-2 w-full rounded-full bg-white/10">
            <!-- svelte-ignore element_invalid_self_closing_tag -->
            <div
              class="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-[width] duration-200"
              style={`width:${total ? ((total - totalRemaining) / total) * 100 : 0}%;`}
            />
          </div>

          <!-- ✅ WARNINGS (있을 때만 노출) -->
          {#if warnings?.length}
            <div class="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2">
              <div class="flex items-center gap-2 text-xs font-extrabold text-amber-200">
                <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20">!</span>
                주의/안내
              </div>
              <ul class="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-100/90">
                {#each warnings as w, wi (typeof w === "string" ? w : `${w.tag}-${wi}`)}
                  <li class="flex gap-2">
                    <span class="mt-[2px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/80"></span>
                    <span class="min-w-0">{warningText(w)}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>

        <!-- CONTENT -->
        <div class="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
          {#if steps.length}
            <div class="flex min-h-0 h-full flex-col">
              <!-- 이미지 -->
              <button
                type="button"
                class="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-black/20 shrink-0 text-left"
                on:click={togglePlayFromImage}
                aria-label="운동 시작 또는 재개"
                title={paused ? "시작/재개" : "일시정지"}
              >
                <img
                  src={current.imgSrc}
                  alt={current.title}
                  class="w-full object-contain p-3
                        h-[clamp(190px,32dvh,320px)]
                        md:h-[clamp(220px,34dvh,360px)]"
                  draggable="false"
                />

                <div class="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-extrabold">
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                  남은 {fmt(remaining)}
                </div>

                {#if paused && !finished}
                  <div class="absolute inset-0 grid place-items-center bg-black/35">
                    <div class="rounded-2xl border border-white/15 bg-black/50 px-4 py-2 text-xs font-extrabold">
                      ▶ 이미지 탭해서 다음 루틴 시작
                    </div>
                  </div>
                {/if}
              </button>

              <!-- 진행 순서 -->
              <div class="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-4">
                <div class="text-sm font-extrabold shrink-0">진행 순서</div>

                <ol
                  bind:this={listEl}
                  class="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
                >
                  {#each steps as s, i (s.key)}
                    <li use:registerItem(i) class="rounded-2xl">
                      <button
                        type="button"
                        class={[
                          "w-full flex items-center justify-between rounded-2xl px-3 py-2 text-left",
                          "transition active:scale-[0.99]",
                          "hover:bg-black/5 dark:hover:bg-white/10",
                          i === idx
                            ? "bg-emerald-500/10 ring-1 ring-emerald-400/30"
                            : "bg-white dark:bg-white/5",
                        ].join(" ")}
                        on:click={() => jumpTo(i, true)}
                        aria-label={`${i + 1}번 ${s.title}로 이동`}
                      >
                        <div class="min-w-0">
                          <div class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {i + 1}. {s.title}
                          </div>
                        </div>

                        <div class="shrink-0 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {#if Math.round(s.seconds / 60) === 0}
                            {s.seconds}초
                          {:else}
                            {Math.round(s.seconds / 60)}분
                          {/if}
                        </div>
                      </button>
                    </li>
                  {/each}
                </ol>
              </div>
            </div>
          {/if}
        </div>

        <!-- FOOTER -->
        <div
          class="shrink-0 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 px-4 py-3 backdrop-blur sm:px-5"
          style="height: var(--footer-h);"
        >
          {#if !finished}
            <div class="flex h-full items-center gap-2">
              {#if !paused}
                <button
                  class="flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm font-extrabold hover:bg-white/10"
                  on:click={pause}
                >
                  ⏸ 일시정지
                </button>
              {:else}
                <button
                  class="flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm font-extrabold hover:bg-white/10"
                  on:click={() => resume(true)}
                >
                  ▶ 재개
                </button>
              {/if}

              <button
                class="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-extrabold text-white
                       shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                on:click={restart}
                title="처음부터 다시"
              >
                ↻ 다시하기
              </button>
            </div>
          {:else}
            <div class="flex h-full flex-col items-center justify-center text-center">
              <div class="text-base font-extrabold">루틴 완료 🎉</div>

              <div class="mt-3 flex items-center justify-center gap-4">
                <button
                  class="inline-flex h-12 w-12 items-center justify-center rounded-3xl
                         border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-xl hover:bg-white/10"
                  on:click={restart}
                  aria-label="다시 하기"
                  title="다시 하기"
                >
                  ↻
                </button>
                <button
                  class="inline-flex h-12 w-12 items-center justify-center rounded-3xl
                         bg-gradient-to-r from-emerald-500 to-sky-500 text-xl text-white
                         shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  on:click={close}
                  aria-label="종료 하기"
                  title="종료 하기"
                >
                  ⏹
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
