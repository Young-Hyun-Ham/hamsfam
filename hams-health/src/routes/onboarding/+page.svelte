<!-- src/routes/onboarding/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { QUESTIONS } from "$lib/onboarding/questions";
  import {
    onboarding,
    setAnswer,
    nextStep,
    prevStep,
    resetOnboarding,
  } from "$lib/onboarding/store";

  import { recoState, requestRecommendation, resetReco } from "$lib/onboarding/reco.store";
  import type {
    RecommendInput,
    RoutineStepResolved,
  } from "$lib/onboarding/reco.types";

  import WorkoutPlayerModal from "$lib/components/WorkoutPlayerModal.svelte";

  let playerOpen = false;

  // ✅ 모달로 넘길 데이터(선택된 pick 기반)
  type PlayerStep = RoutineStepResolved & { key: string };

  let playerTitle = "추천 루틴";
  let playerWarnings: Array<{ tag: string; text: string }> = [];
  let playerSteps: PlayerStep[] = [];

  const fallbackImg = "/workouts/placeholder.png";

  function toPlayerSteps(pick: any): PlayerStep[] {
    const steps = (pick?.routine?.steps ?? []) as any[];

    return steps.map((s, i) => {
      const id: string | null = s?.id ?? s?.step_id ?? null;

      const title: string = s?.title ?? s?.name ?? `Step ${i + 1}`;

      const seconds: number =
        typeof s?.seconds === "number"
          ? Math.max(1, s.seconds)
          : Math.max(1, Number(s?.min ?? 0)) * 60; // 구버전 fallback

      const imgSrc: string =
        s?.imgSrc ??
        s?.imgsrc ??
        (id ? `/workouts/${id}.png` : null) ??
        fallbackImg;

      return {
        key: id ? `${pick?.subtype_id ?? "pick"}-${i}-${id}` : `${pick?.subtype_id ?? "pick"}-${i}-${title}`,
        id: id ?? `unknown_${i}`,
        seconds,
        title,
        imgSrc,
        phase: s?.phase,
      };
    });
  }

  function openPlayer(pick: any) {
    playerTitle = pick?.copy?.title ?? `${pick?.subtype_name ?? "추천"} 루틴`;
    playerWarnings = (pick?.warnings ?? []) as Array<{ tag: string; text: string }>;
    playerSteps = toPlayerSteps(pick);
    playerOpen = true;
  }

  let touchStartX = 0;
  let touchStartY = 0;

  let showResults = false;

  $: total = QUESTIONS.length;
  $: step = $onboarding.step;
  $: q = QUESTIONS[step];
  $: selected = q ? ($onboarding.answers[q.id] ?? "") : "";
  $: progress = total <= 1 ? 0 : Math.round((step / (total - 1)) * 100);

  // 마지막 step에서 결과 미리보기 활성화(선택되면 즉시 보여줘도 되고)
  $: canShowPreview = step === total - 1;

  function select(v: string) {
    if (!q) return;
    setAnswer(q.id, v);

    // ✅ 이미 결과를 보고 있는 상태에서 값을 바꾸면, 결과는 다시 계산해야 함
    if (showResults) {
      resetReco();
    }
  }

  function goNext() {
    if (!q) return;
    if (!selected) return;
    if (step < total - 1) {
      nextStep(total - 1);
      showResults = false;
      resetReco();
    }
  }

  function goPrev() {
    if (step > 0) {
      prevStep();
      showResults = false;
      resetReco();
    } else {
      showExitConfirm = true;
    }
  }

  let showExitConfirm = false;

  function exitToHome() {
    showExitConfirm = false;
    goto("/");
  }

  async function submit() {
    // ✅ 서버로 보낼 RecommendInput (엔진이 steps 조합할 때 필요한 최소치 포함)
    const input: RecommendInput = {
      answers: $onboarding.answers,
      goals: ["체형", "감량"],

      constraints: {
        time_min: 15,
        equipment: ["none"],
        space: "small",
        noise_level: "low",
        injury_flags: {
          knee_sensitive: false,
          wrist_sensitive: false,
          lower_back_sensitive: false,
          shoulder_sensitive: false,
          neck_sensitive: false,
        },
      },

      context: { experience_level: "beginner", weekly_days: 3 },
    };

    showResults = true;

    // ✅ 결과 섹션으로 스크롤 (로딩 카드가 먼저 보이게)
    requestAnimationFrame(() => {
      document.getElementById("recommendation-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // 추천 요청
    await requestRecommendation(input);
  }

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

    // 스와이프 이동: 다음은 선택이 있어야만
    if (dx < 0) {
      if (selected && step < total - 1) nextStep(total - 1);
    } else {
      if (step > 0) prevStep();
    }
  }

  onMount(() => {
    document.documentElement.style.setProperty(
      "--vh",
      `${window.innerHeight * 0.01}px`
    );
    const onResize = () =>
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });

  function pct(v: number) {
    return `${Math.round(v * 100)}%`;
  }

  function scoreBadge(score: number, confidence: number) {
    // 간단 뱃지 텍스트
    if (confidence >= 0.85) return "매우 적합";
    if (confidence >= 0.7) return "적합";
    if (confidence >= 0.6) return "무난";
    return "참고";
  }
</script>

<div
  class="min-h-[calc(var(--vh,1vh)*100)] bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50
         px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
  on:touchstart={onTouchStart}
  on:touchend={onTouchEnd}
>
  <div class="mx-auto w-full max-w-lg">
    <!-- Top -->
    <header class="pt-4">
      <div class="grid grid-cols-[44px_1fr_44px] items-center gap-2">
        <button
          class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white
                 shadow-sm disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900"
          on:click={goPrev}
          aria-label="이전"
        >
          <span class="text-lg">←</span>
        </button>

        <div class="text-center">
          <div class="text-xs text-zinc-500 dark:text-zinc-400">
            맞춤 홈트 찾기
          </div>
          <div class="text-base font-extrabold tracking-tight">
            내 운동 성향을 알려줘
          </div>
        </div>

        <button
          class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white
                 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          on:click={() => {
            resetOnboarding();
            showResults = false;
            resetReco();
          }}
          aria-label="처음부터"
        >
          <span class="text-lg">↺</span>
        </button>
      </div>

      <!-- Progress + Theme -->
      <div class="mt-4 flex items-center gap-3">
        <div class="h-2 flex-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
          <!-- svelte-ignore element_invalid_self_closing_tag -->
          <div
            class="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-[width] duration-200 ease-out"
            style={`width:${progress}%;`}
          />
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between">
        <span
          class="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs
                 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {step + 1} / {total}
        </span>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">{q?.dimension}</span>
      </div>
    </header>

    <!-- Card -->
    {#if q}
      <main class="mt-5" transition:fade={{ duration: 120 }}>
        <section
          class="rounded-3xl border border-zinc-200 bg-white p-5
                 shadow-[0_10px_30px_rgba(0,0,0,0.08)]
                 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          in:fly={{ y: 10, duration: 160 }}
          out:fade={{ duration: 120 }}
        >
          <article class="prose prose-zinc max-w-none dark:prose-invert">
            <h2 class="m-0 text-xl font-extrabold leading-snug">{q.title}</h2>
            {#if q.desc}
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {q.desc}
              </p>
            {/if}
          </article>

          <!-- 라디오 선택 -->
          <fieldset class="mt-5 space-y-2.5">
            <legend class="sr-only">선택지</legend>

            {#each q.options as opt (opt.value)}
              <label
                class={[
                  "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 shadow-sm transition",
                  "bg-zinc-50 border-zinc-200 hover:bg-white",
                  "dark:bg-zinc-950/40 dark:border-zinc-800 dark:hover:bg-zinc-950/70",
                  selected === opt.value
                    ? "border-emerald-400/70 bg-emerald-50 ring-2 ring-emerald-200/70 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                    : "ring-0",
                ].join(" ")}
              >
                <input
                  class="mt-0.5 h-5 w-5"
                  type="radio"
                  name={q.id}
                  value={opt.value}
                  checked={selected === opt.value}
                  on:change={(e) =>
                    select((e.currentTarget as HTMLInputElement).value)}
                />

                <div class="min-w-0">
                  <div
                    class="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50"
                  >
                    {opt.label}
                  </div>
                  {#if opt.hint}
                    <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {opt.hint}
                    </div>
                  {/if}
                </div>
              </label>
            {/each}
          </fieldset>

          <div
            class="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
          >
            <!-- svelte-ignore element_invalid_self_closing_tag -->
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {#if step < total - 1}
              <span>선택 후 ‘다음’ 버튼을 눌러 진행해줘</span>
            {:else}
              <span>선택 후 ‘분석 시작’ 버튼을 눌러 결과를 확인해줘</span>
            {/if}
          </div>
        </section>

        <!-- ✅ 결과 미리보기 힌트(마지막 페이지에서만) -->
        {#if canShowPreview}
          <div class="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 h-9 w-9 shrink-0 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 shadow-sm"></div>
              <div class="min-w-0">
                <div class="text-sm font-extrabold">마지막 단계야</div>
                <div class="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  ‘분석 시작’을 누르면 성향 기반 추천 운동 타입 카드가 아래에 표시돼.
                </div>
              </div>
            </div>
          </div>
        {/if}
      </main>
    {/if}

    <!-- ✅ Recommendation Results -->
    {#if showResults}
      <section
        id="recommendation-section"
        class="mt-5 space-y-4"
        in:fly={{ y: 12, duration: 180 }}
        out:fade={{ duration: 120 }}
      >
        {#if $recoState.loading}
          <article class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div class="text-sm font-extrabold">추천을 계산 중…</div>
            <div class="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              잠시만 기다려줘. (AI + 엔진이 step_pool로 루틴을 조합 중)
            </div>
          </article>

        {:else if $recoState.error}
          <article class="rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-500/20 dark:bg-zinc-900">
            <div class="text-sm font-extrabold text-red-700 dark:text-red-200">추천 실패</div>
            <div class="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
              {$recoState.error}
            </div>
            <div class="mt-4">
              <button
                class="rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm"
                on:click={submit}
              >
                다시 시도
              </button>
            </div>
          </article>

        {:else if $recoState.data?.top_picks?.length}
          {#each $recoState.data.top_picks as pick, idx (pick.subtype_id)}
            <!-- Top Pick Card -->
            <article
              class="rounded-3xl border border-zinc-200 bg-white p-5
                     shadow-[0_10px_30px_rgba(0,0,0,0.10)]
                     dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_10px_30px_rgba(0,0,0,0.50)]"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="inline-flex items-center gap-2">
                    <span
                      class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700
                             ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20"
                    >
                      {idx === 0 ? "TOP 1" : idx === 1 ? "TOP 2" : "TOP 3"}
                    </span>
                    <span
                      class="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700
                             shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200"
                    >
                      {scoreBadge(pick.score, pick.confidence)} · {pct(pick.confidence)}
                    </span>
                  </div>

                  <h3 class="mt-3 text-lg font-extrabold tracking-tight">
                    {pick.copy.title}
                  </h3>
                  <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {pick.copy.summary}
                  </p>
                </div>

                <div
                  class="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500
                         shadow-[0_10px_25px_rgba(0,0,0,0.18)]"
                  aria-hidden="true"
                ></div>
              </div>

              <!-- Reasons -->
              <div class="mt-4 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
                <div class="text-sm font-extrabold">왜 이게 맞냐면</div>
                <ul class="mt-2 space-y-2">
                  {#each pick.reasons as r (r.tag)}
                    <li class="flex items-start gap-2">
                      <!-- svelte-ignore element_invalid_self_closing_tag -->
                      <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {r.tag}
                        </div>
                        <div class="text-xs text-zinc-600 dark:text-zinc-300">
                          {r.why}
                        </div>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>

              <!-- Routine -->
              <div class="mt-4">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-extrabold">
                    추천 루틴 ({pick.routine.duration_min}분 · {pick.routine.level})
                  </div>
                  <span
                    class="text-xs text-zinc-500 dark:text-zinc-400"
                    title="내 답변에 따라 자동 구성"
                  >
                    score: {pick.score}
                  </span>
                  
                  <!-- ✅ Play 버튼 -->
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-xl
                          border border-zinc-200 bg-white shadow-sm hover:bg-zinc-50
                          dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-950/60"
                    on:click={() => openPlayer(pick)}
                    aria-label="루틴 재생"
                    title="루틴 재생"
                  >
                    ▶
                  </button>
                </div>

                <ol class="mt-3 space-y-2">
                  {#each pick.routine.steps as s, i (s.id ?? s.title ?? i)}
                    <li
                      class="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm
                             dark:border-zinc-800 dark:bg-zinc-950/20"
                    >
                      <div class="flex min-w-0 items-center gap-3">
                        <span
                          class="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 text-xs font-extrabold text-zinc-700
                                 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {i + 1}
                        </span>
                        <span class="truncate text-sm font-semibold">
                          {s.title}
                        </span>
                      </div>
                      <span
                        class="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700
                               dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {Math.max(1, Math.round((s.seconds ?? 60) / 60))}분
                      </span>
                    </li>
                  {/each}
                </ol>
              </div>

              <!-- Warnings -->
              {#if pick.warnings?.length}
                <div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <div class="text-sm font-extrabold text-amber-900 dark:text-amber-200">주의할 점</div>
                  <ul class="mt-2 space-y-2">
                    {#each pick.warnings as w (w.tag)}
                      <li class="text-xs text-amber-900 dark:text-amber-200">
                        • {w.text}
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </article>
          {/each}

          <!-- Meta tags chips -->
          <article class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div class="text-sm font-extrabold">당신의 성향 키워드 TOP</div>
            <div class="mt-3 flex flex-wrap gap-2">
              {#each $recoState.data.meta.computed_tags_top as t (t.tag)}
                <span
                  class="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700
                         shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200"
                >
                  {t.tag} · {t.score}
                </span>
              {/each}
            </div>
            <div class="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              {$recoState.data.meta.explain}
            </div>
          </article>

          <!-- Alternatives -->
          {#if $recoState.data.alternatives?.length}
            <article class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div class="text-sm font-extrabold">대안 추천</div>
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                {#each $recoState.data.alternatives as alt (alt.subtype_id)}
                  <div
                    class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm
                           dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <div class="text-sm font-extrabold">{alt.subtype_name}</div>
                    <div class="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                      {alt.why_short}
                    </div>
                    <div class="mt-3 inline-flex items-center gap-2">
                      <span
                        class="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700
                               dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        score: {alt.score}
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            </article>
          {/if}
        {:else}
          <article class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div class="text-sm font-extrabold">추천 결과를 만들 수 없어요</div>
            <div class="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              답변이 충분하지 않거나 추천 데이터가 비어 있을 수 있어요.
            </div>
          </article>
        {/if}
      </section>
    {/if}

    <!-- Bottom CTA -->
    <footer
      class="sticky bottom-0 mt-5 pb-4 pt-3 bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-950"
    >
      {#if step < total - 1}
        <button
          class="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-4 text-base font-extrabold
                 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] disabled:opacity-50"
          on:click={goNext}
          disabled={!selected}
        >
          다음
        </button>
      {:else}
        {#if !showResults}
          <button
            class="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-4 text-base font-extrabold
                   text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] disabled:opacity-50"
            on:click={submit}
            disabled={!selected}
          >
            분석 시작
          </button>
        {:else}
          <div class="grid grid-cols-2 gap-2">
            <button
              class="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-base font-extrabold
                     text-zinc-800 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              on:click={() => {
                showResults = false;
              }}
            >
              다시 선택
            </button>
            <button
              class="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-4 text-base font-extrabold
                     text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
              on:click={() => {
                alert("완료! (여기서 저장/다음 화면 이동을 붙이면 됨)");
              }}
            >
              완료
            </button>
          </div>
        {/if}
      {/if}

      <WorkoutPlayerModal
        open={playerOpen}
        title={playerTitle}
        steps={playerSteps}
        warnings={playerWarnings}
        onClose={() => (playerOpen = false)}
      />

    </footer>
  </div>

  <!-- 뒤로가기 confirm모달 팝업 -->
  {#if showExitConfirm}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl
              dark:bg-zinc-900"
        transition:fade
      >
        <h3 class="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">
          설문을 종료할까요?
        </h3>

        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          지금 종료하면 추천 정확도가 낮아질 수 있어요.
        </p>

        <div class="mt-6 flex gap-3">
          <button
            class="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold
                  text-zinc-700 hover:bg-zinc-50
                  dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            on:click={() => (showExitConfirm = false)}
          >
            계속하기
          </button>

          <button
            class="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500
                  px-4 py-3 text-sm font-extrabold text-white"
            on:click={exitToHome}
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

