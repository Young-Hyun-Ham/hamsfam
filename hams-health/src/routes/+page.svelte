<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { theme, applyTheme, THEME_KEY } from "$lib/ui/theme";
  import type { Theme as ThemeMode } from "$lib/ui/theme";

  import WorkoutPlayerModal from "$lib/components/WorkoutPlayerModal.svelte";
  import { buildProgramOutput } from "$lib/onboarding/program.builder";
  import { SUBTYPES_STEPS } from "$lib/onboarding/reco.data";
  import { PROGRAM_FINISH_STEP_IDS, PROGRAM_MAIN_STEP_IDS, PROGRAM_START_STEP_IDS } from "$lib/onboarding/questions";

  const onStart = () => goto("/onboarding");

  // ✅ theme persistence
  let themeMode: ThemeMode = "system";

  let mql: MediaQueryList | null = null;
  let onMqlChange: ((e: MediaQueryListEvent) => void) | null = null;

  onMount(() => {
    // init
    const saved = (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? "system";
    themeMode = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    applyTheme(themeMode);

    // system watcher
    mql = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
    onMqlChange = () => {
      if (themeMode === "system") applyTheme("system");
    };

    if (mql?.addEventListener) mql.addEventListener("change", onMqlChange);
    else if ((mql as any)?.addListener) (mql as any).addListener(onMqlChange);

    // 오늘의 추천
    refreshPreview();
  });

  onDestroy(() => {
    if (!mql || !onMqlChange) return;
    if (mql.removeEventListener) mql.removeEventListener("change", onMqlChange);
    else if ((mql as any)?.removeListener) (mql as any).removeListener(onMqlChange);
  });

  function pickOne<T>(arr: T[]) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function getMeta(id: string) {
    return SUBTYPES_STEPS.find((s) => s.id === id);
  }

  // ✅ "오늘의 추천 예시" 데이터(랜덤 1개씩)
  let previewStartId = "";
  let previewMainId = "";
  let previewFinishId = "";

  function refreshPreview() {
    previewStartId = pickOne(PROGRAM_START_STEP_IDS);
    previewMainId = pickOne(PROGRAM_MAIN_STEP_IDS);
    previewFinishId = pickOne(PROGRAM_FINISH_STEP_IDS);
  }

  // ✅ 플레이어 모달
  let playerOpen = false;
  let playerTitle = "오늘의 추천 예시";
  let playerWarnings: Array<{ tag: string; text: string }> = [];
  let playerSteps: Array<any> = [];

  const fallbackImg = "/workouts/placeholder.png";

  // ✅ buildProgramOutput 결과(top_picks[0])를 모달 step 형태로 변환
  function toPlayerSteps(pick: any) {
    const steps = (pick?.routine?.steps ?? []) as any[];
    return steps.map((s: any, i: number) => {
      const id: string | null = s?.id ?? s?.step_id ?? null;
      const title: string = s?.title ?? s?.name ?? `Step ${i + 1}`;
      const seconds: number = typeof s?.seconds === "number" ? Math.max(1, s.seconds) : 60;

      const imgSrc: string =
        s?.imgSrc ??
        s?.imgsrc ??
        (id ? `/workouts/${id}.png` : null) ??
        fallbackImg;

      return {
        key: id ? `preview-${i}-${id}` : `preview-${i}-${title}`,
        id: id ?? `unknown_${i}`,
        seconds,
        title,
        imgSrc,
        phase: s?.phase,
      };
    });
  }

  function playPreview() {
    const input: any = {
      answers: {
        q_program_time: 4,
        q_program_start_stretch: [previewStartId],
        q_program_main_steps: [previewMainId],
        q_program_finish_stretch: [previewFinishId],
      },
      goals: ["체형", "감량"],
      constraints: { time_min: 15, equipment: ["none"], space: "small", noise_level: "low" },
      context: { experience_level: "beginner", weekly_days: 3 },
    };

    const out = buildProgramOutput(input);
    const pick = out?.top_picks?.[0];

    if (!pick) return;

    playerTitle = "오늘의 추천 예시";
    playerWarnings = [];
    playerSteps = toPlayerSteps(pick);
    playerOpen = true;
  }

  // ✅ reactive 선언
  $: startMeta = getMeta(previewStartId);
  $: mainMeta = getMeta(previewMainId);
  $: finMeta = getMeta(previewFinishId);
</script>

<svelte:head>
  <title>Hams Health</title>
</svelte:head>

<div class="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <!-- 배경 장식 -->
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <div class="pointer-events-none fixed inset-0 overflow-hidden">
    <div
      class="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full blur-3xl opacity-60
             bg-gradient-to-r from-emerald-300 via-sky-300 to-violet-300
             dark:from-emerald-600 dark:via-sky-600 dark:to-violet-600"
    />
    <div
      class="absolute -bottom-28 right-[-10rem] h-72 w-72 rounded-full blur-3xl opacity-40
             bg-gradient-to-tr from-amber-200 to-rose-300
             dark:from-amber-500 dark:to-rose-600"
    />
  </div>

  <div class="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5">
    <!-- 상단 -->
    <header class="flex items-center justify-between pt-6">
      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950
                 grid place-items-center shadow-sm"
        >
          <span class="text-sm font-black">HH</span>
        </div>
        <div class="leading-tight">
          <div class="text-sm font-semibold tracking-tight">Hams Health</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">홈트 루틴 추천 · 온보딩</div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- 테마 3분할 토글 -->
        <div
          class="inline-flex items-center rounded-full border border-slate-200 bg-white/70 p-1 text-xs
                backdrop-blur dark:border-slate-800 dark:bg-slate-900/60"
          role="group"
          aria-label="Theme"
        >
          <button
            type="button"
            on:click={() => { themeMode = "light"; theme.set("light"); }}
            class={[
              "px-3 py-1 rounded-full transition",
              themeMode === "light"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
            ].join(" ")}
            aria-pressed={themeMode === "light"}
            title="라이트"
          >
            라이트
          </button>

          <button
            type="button"
            on:click={() => { themeMode = "dark"; theme.set("dark"); }}
            class={[
              "px-3 py-1 rounded-full transition",
              themeMode === "dark"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
            ].join(" ")}
            aria-pressed={themeMode === "dark"}
            title="다크"
          >
            다크
          </button>

          <button
            type="button"
            on:click={() => { themeMode = "system"; theme.set("dark"); }}
            class={[
              "px-3 py-1 rounded-full transition",
              themeMode === "system"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
            ].join(" ")}
            aria-pressed={themeMode === "system"}
            title="시스템"
          >
            시스템
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-600
                 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
        >
          v0.1
        </span>
      </div>
    </header>

    <!-- 메인 -->
    <main class="flex flex-1 flex-col justify-center py-10">
      <div
        class="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]
               backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/50"
      >
        <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <!-- 왼쪽: 카피 -->
          <div class="max-w-2xl">
            <div
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs
                     text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              오늘도 부담 없이 시작하기
            </div>

            <h1 class="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              내 몸 상태에 맞춘
              <span
                class="bg-gradient-to-r from-emerald-600 via-sky-600 to-violet-600 bg-clip-text text-transparent
                       dark:from-emerald-400 dark:via-sky-400 dark:to-violet-400"
              >
                홈트 루틴
              </span>
              을 빠르게 추천받자
            </h1>

            <p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              간단한 질문에 답하면, 시간/공간/장비/강도에 맞춰 루틴을 구성해줘.
              워크아웃 플레이어로 바로 따라할 수 있게 구성하는 게 목표야.
            </p>

            <!-- 카드 3개 -->
            <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm
                       dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="text-xs font-semibold">맞춤 추천</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  목표/강도/제약 기반
                </div>
              </div>

              <div
                class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm
                       dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="text-xs font-semibold">루틴 플레이</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  타이머/스텝 진행
                </div>
              </div>

              <div
                class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm
                       dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="text-xs font-semibold">모바일 친화</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  캡시터 확장 고려
                </div>
              </div>
            </div>
          </div>

          <!-- 오른쪽: 미리보기 패널 -->
          <div
            class="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-md
                   dark:border-slate-800 dark:bg-slate-950/40"
          >
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold">오늘의 추천 예시</div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm
                        hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
                  on:click={refreshPreview}
                  title="랜덤 새로 뽑기"
                >
                  랜덤
                </button>

                <button
                  type="button"
                  class="rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm"
                  on:click={playPreview}
                  title="미리보기 재생"
                >
                  Preview ▶
                </button>
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div class="text-xs">
                  <div class="font-semibold">워밍업</div>
                  <div class="mt-0.5 text-slate-500 dark:text-slate-400">{startMeta?.name ?? previewStartId}</div>
                </div>
                <div class="rounded-full bg-emerald-100 px-2 py-1 text-[11px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                  warmup
                </div>
              </div>

              <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div class="text-xs">
                  <div class="font-semibold">본운동</div>
                  <div class="mt-0.5 text-slate-500 dark:text-slate-400">{mainMeta?.name ?? previewMainId}</div>
                </div>
                <div class="rounded-full bg-sky-100 px-2 py-1 text-[11px] text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                  main
                </div>
              </div>

              <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div class="text-xs">
                  <div class="font-semibold">쿨다운</div>
                  <div class="mt-0.5 text-slate-500 dark:text-slate-400">{finMeta?.name ?? previewFinishId}</div>
                </div>
                <div class="rounded-full bg-violet-100 px-2 py-1 text-[11px] text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                  relax
                </div>
              </div>
            </div>

            <div class="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              START를 누르면 온보딩 질문으로 이동해서
              <span class="font-semibold text-slate-700 dark:text-slate-200">실제 추천 루틴</span>을 받아볼 수 있어.
            </div>
          </div>
        </div>

        <!-- 하단 START -->
        <div class="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs text-slate-500 dark:text-slate-400">
            Tip: 다크모드는 <span class="font-semibold">시스템 설정</span>을 따르거나, 상단 토글로 변경할 수 있어.
          </div>

          <button
            type="button"
            on:click={onStart}
            class="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white
                   shadow-[0_18px_40px_-20px_rgba(0,0,0,0.6)] transition
                   hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-26px_rgba(0,0,0,0.75)]
                   active:translate-y-0
                   dark:bg-white dark:text-slate-950"
          >
            <span>START</span>
            <span class="transition group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      </div>
    </main>

    <!-- 푸터 -->
    <footer class="pb-8 pt-4 text-center text-xs text-slate-500 dark:text-slate-400">
      © {new Date().getFullYear()} Hams Health · Built with SvelteKit + Tailwind
    </footer>
  </div>

  <WorkoutPlayerModal
    open={playerOpen}
    title={playerTitle}
    steps={playerSteps}
    warnings={playerWarnings}
    onClose={() => (playerOpen = false)}
  />
</div>
