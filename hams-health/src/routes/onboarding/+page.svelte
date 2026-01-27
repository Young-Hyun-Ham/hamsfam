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
    toggleMultiAnswer,
    setStep,
  } from "$lib/onboarding/store";

  import { recoState, requestRecommendation, resetReco } from "$lib/onboarding/reco.store";
  import type { RecommendInput, RoutineStepResolved } from "$lib/onboarding/reco.types";

  import WorkoutPlayerModal from "$lib/components/WorkoutPlayerModal.svelte";

  let playerOpen = false;

  // ✅ 모달로 넘길 데이터(선택된 pick 기반)
  type PlayerStep = RoutineStepResolved & { key: string };

  let playerTitle = "추천 루틴";
  let playerWarnings: Array<{ tag: string; text: string }> = [];
  let playerSteps: PlayerStep[] = [];

  // ===========================================
  // 대안 루틴 재생용
  function playAlternative(alt: any) {
    // ✅ 기존 플레이어 상태를 그대로 사용
    playerTitle = alt?.subtype_name || "대안 루틴";
    playerWarnings = []; // 대안 warnings가 생기면 alt.warnings로 교체 가능

    // alt도 routine.steps 구조가 top_picks와 동일하니 그대로 변환 재사용
    playerSteps = toPlayerSteps({
      subtype_id: alt?.subtype_id ?? "alt",
      subtype_name: alt?.subtype_name,
      routine: alt?.routine,
      copy: { title: alt?.subtype_name ?? "대안 루틴" }, // openPlayer가 쓰는 title 호환
    });

    playerOpen = true;
  }
  // ===========================================

  // ===========================================
  // 썸네일 미리보기 모달
  let previewOpen = false;
  let previewTitle = "";
  let previewImg = "";

  function openPreview(opt: any) {
    previewTitle = opt?.label ?? "미리보기";
    previewImg = opt?.thumbnail ?? "";
    previewOpen = true;
  }
  function closePreview() {
    previewOpen = false;
    previewTitle = "";
    previewImg = "";
  }
  // ===========================================

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
        key: id
          ? `${pick?.subtype_id ?? "pick"}-${i}-${id}`
          : `${pick?.subtype_id ?? "pick"}-${i}-${title}`,
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

  // ✅ 항상 포함될 질문(프로그램 선택을 위한 최소 3개)
  const CORE_IDS = new Set(["q0", "q0_gender", "q0_reco_mode"]);

  // ✅ 현재 추천 모드
  $: mode = (typeof $onboarding.answers?.q0_reco_mode === "string"
    ? ($onboarding.answers.q0_reco_mode as string)
    : "llm");

  // ✅ program 모드면: core 3개 + program 4개(시간1 + step3)만 남김
  // ✅ llm/engine 모드면: program 질문은 제외하고 기존 23개(혹은 기존 세트)만 노출
  $: visibleQuestions =
    mode === "program"
      ? QUESTIONS.filter((qq) => CORE_IDS.has(qq.id) || qq.dimension === "program")
      : QUESTIONS.filter((qq) => qq.dimension !== "program");

  // ✅ 화면에서 사용할 총 질문 수/현재 질문
  $: total = visibleQuestions.length;

  // ✅ step이 범위를 벗어나면 보정 (모드 변경 시 필수)
  $: if ($onboarding.step > total - 1) {
    setStep(Math.max(0, total - 1));
  }

  $: step = Math.min($onboarding.step, Math.max(0, total - 1));
  $: q = visibleQuestions[step];

  // ✅ 현재 답변 원본
  $: answerRaw = q ? $onboarding.answers[q.id] : "";

  // ✅ choice(라디오)용 selected string
  $: selectedValue = typeof answerRaw === "string" ? answerRaw : "";

  // ✅ multi(체크)용 selected array
  $: selectedList = Array.isArray(answerRaw) ? answerRaw : [];

  // ✅ 현재 질문이 multi인지
  $: isMulti = q && (q as any).kind === "multi";

  // ✅ 다음 버튼 활성화 조건
  $: hasSelection = isMulti ? selectedList.length > 0 : Boolean(selectedValue);

  $: progress = total <= 1 ? 0 : Math.round((step / (total - 1)) * 100);

  // 마지막 step에서 결과 미리보기 활성화
  $: canShowPreview = step === total - 1;

  // =========================
  // ✅ DOB(select) 입력형 질문 지원
  // =========================
  let dobYear = "";
  let dobMonth = "";
  let dobDay = "";
  let lastQid = "";

  $: if (q && q.id !== lastQid) {
    lastQid = q.id;

    if ((q as any).kind === "dob") {
      const raw = $onboarding.answers[q.id];
      const v = (typeof raw === "string" ? raw : "").trim();
      const [yy, mm, dd] = v.split("-");
      dobYear = yy ?? "";
      dobMonth = mm ?? "";
      dobDay = dd ?? "";
    } else {
      dobYear = "";
      dobMonth = "";
      dobDay = "";
    }
  }

  function pad2(v: string) {
    return v.padStart(2, "0");
  }

  function daysInMonth(year: number, month1: number) {
    // month1: 1-12
    return new Date(year, month1, 0).getDate();
  }

  function setDob(part: "year" | "month" | "day", value: string) {
    if (!q) return;
    if ((q as any).kind !== "dob") return;

    if (part === "year") dobYear = value;
    if (part === "month") dobMonth = value;
    if (part === "day") dobDay = value;

    // month/year 변경 시 day가 범위를 초과하면 자동 보정
    const y = Number(dobYear);
    const m = Number(dobMonth);
    if (y && m && dobDay) {
      const maxDay = daysInMonth(y, m);
      if (Number(dobDay) > maxDay) dobDay = String(maxDay);
    }

    // ✅ 완성되면 YYYY-MM-DD로 저장, 아니면 ""(미응답)
    if (dobYear && dobMonth && dobDay) {
      setAnswer(q.id, `${dobYear}-${pad2(dobMonth)}-${pad2(dobDay)}`);
    } else {
      setAnswer(q.id, "");
    }

    if (showResults) resetReco();
  }

  $: dobMaxYear =
    q && (q as any).kind === "dob"
      ? ((q as any).maxYear ?? new Date().getFullYear())
      : new Date().getFullYear();

  $: dobMinYear =
    q && (q as any).kind === "dob"
      ? ((q as any).minYear ?? dobMaxYear - 90)
      : dobMaxYear - 90;

  $: dobYears = Array.from(
    { length: Math.max(0, dobMaxYear - dobMinYear + 1) },
    (_, i) => String(dobMaxYear - i)
  );
  $: dobMonths = Array.from({ length: 12 }, (_, i) => String(i + 1));
  $: dobDays = (() => {
    const y = Number(dobYear);
    const m = Number(dobMonth);
    if (!y || !m) return Array.from({ length: 31 }, (_, i) => String(i + 1));
    const max = daysInMonth(y, m);
    return Array.from({ length: max }, (_, i) => String(i + 1));
  })();

  // =========================
  // ✅ 선택/다음/이전
  // =========================
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
    if (!hasSelection) return;

    if (step < total - 1) {
      nextStep(total - 1);
      showResults = false;
      resetReco();
    }
  }

  let showExitConfirm = false;

  function goPrev() {
    if (step > 0) {
      prevStep();
      showResults = false;
      resetReco();
    } else {
      showExitConfirm = true;
    }
  }

  function exitToHome() {
    showExitConfirm = false;
    goto("/");
  }

  async function submit() {
    // ✅ 서버로 보낼 RecommendInput (엔진이 steps 조합할 때 필요한 최소치 포함)
    const a = $onboarding.answers;
    const timeMin =
      mode === "program"
        ? Number(a.q_program_time ?? 15)
        : (a.q5 === "long" ? 60 : a.q5 === "normal" ? 30 : a.q5 === "short" ? 15 : 15);

    const input: RecommendInput = {
      answers: $onboarding.answers as any,
      goals: ["체형", "감량"],
      
      constraints: {
        time_min: timeMin,
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
    // ✅ program 모드: 결과 섹션 없이 바로 플레이
    if (mode === "program") {
      // 로딩은 필요하니 recoState.loading으로 표시되게 하고 싶으면 showResults=true 유지해도 됨
      showResults = false; // ✅ 결과 카드 영역은 숨김

      await requestRecommendation(input);

      // recoState.data가 들어오면 top_picks[0] 플레이
      const pick = $recoState.data?.top_picks?.[0];
      if (pick) {
        openPlayer(pick);
      }
      return;
    }

    showResults = true;

    // ✅ 결과 섹션으로 스크롤 (로딩 카드가 먼저 보이게)
    requestAnimationFrame(() => {
      document
        .getElementById("recommendation-section")
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
      if (hasSelection && step < total - 1) nextStep(total - 1);
    } else {
      if (step > 0) prevStep();
    }
  }

  onMount(() => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    const onResize = () =>
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
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
          <div class="text-xs text-zinc-500 dark:text-zinc-400">맞춤 홈트 찾기</div>
          <div class="text-base font-extrabold tracking-tight">내 운동 성향을 알려줘</div>
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

      <!-- Progress -->
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
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{q.desc}</p>
            {/if}
          </article>

          {#if (q as any).kind === "dob"}
            <!-- ✅ DOB(select) -->
            <div class="mt-5">
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="sr-only" for="dob-year">년</label>
                  <select
                    id="dob-year"
                    class="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm
                           dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50"
                    value={dobYear}
                    on:change={(e) =>
                      setDob("year", (e.currentTarget as HTMLSelectElement).value)}
                  >
                    <option value="">년</option>
                    {#each dobYears as y (y)}
                      <option value={y}>{y}년</option>
                    {/each}
                  </select>
                </div>

                <div>
                  <label class="sr-only" for="dob-month">월</label>
                  <select
                    id="dob-month"
                    class="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm
                           dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50"
                    value={dobMonth}
                    on:change={(e) =>
                      setDob("month", (e.currentTarget as HTMLSelectElement).value)}
                  >
                    <option value="">월</option>
                    {#each dobMonths as m (m)}
                      <option value={m}>{m}월</option>
                    {/each}
                  </select>
                </div>

                <div>
                  <label class="sr-only" for="dob-day">일</label>
                  <select
                    id="dob-day"
                    class="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm
                           disabled:opacity-60
                           dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50"
                    value={dobDay}
                    disabled={!dobYear || !dobMonth}
                    on:change={(e) =>
                      setDob("day", (e.currentTarget as HTMLSelectElement).value)}
                  >
                    <option value="">일</option>
                    {#each dobDays as d (d)}
                      <option value={d}>{d}일</option>
                    {/each}
                  </select>
                </div>
              </div>

              <div class="mt-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <!-- svelte-ignore element_invalid_self_closing_tag -->
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>나이에 따라 추천 강도/회복 시간을 더 잘 맞출 수 있어</span>
              </div>
            </div>
          {:else if (q as any).kind === "multi"}
            <!-- ✅ MULTI(체크 토글) + 미리보기 -->
            <div class="mt-5 space-y-2.5">
              {#each (q as any).options as opt (opt.value)}
                {@const checked = selectedList.includes(opt.value)}
                <div
                  class={[
                    "flex w-full items-stretch gap-2 rounded-2xl border p-2 shadow-sm transition",
                    "bg-zinc-50 border-zinc-200 hover:bg-white",
                    "dark:bg-zinc-950/40 dark:border-zinc-800 dark:hover:bg-zinc-950/70",
                    checked
                      ? "border-emerald-400/70 bg-emerald-50 ring-2 ring-emerald-200/70 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                      : "ring-0",
                  ].join(" ")}
                >
                  <!-- ✅ 왼쪽: 토글 클릭 영역 -->
                  <button
                    type="button"
                    class="flex flex-1 items-start gap-3 rounded-xl px-3 py-2 text-left"
                    on:click={() => {
                      toggleMultiAnswer(q.id, opt.value);
                      if (showResults) resetReco();
                    }}
                  >
                    <span
                      class={[
                        "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border shrink-0",
                        checked
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950/30",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {#if checked}✓{/if}
                    </span>

                    <div class="min-w-0">
                      <div class="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                        {opt.label}
                      </div>
                      {#if opt.hint}
                        <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {opt.hint}
                        </div>
                      {/if}
                    </div>
                  </button>

                  <!-- ✅ 오른쪽: 미리보기 버튼 -->
                  <button
                    type="button"
                    class="shrink-0 inline-flex items-center justify-center rounded-xl px-3 text-xs font-bold
                          border border-zinc-200 bg-white shadow-sm hover:bg-zinc-50
                          dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-950/60
                          disabled:opacity-40"
                    disabled={!opt.thumbnail}
                    on:click|stopPropagation={() => openPreview(opt)}
                    title={opt.thumbnail ? "미리보기" : "이미지 없음"}
                  >
                    미리보기
                  </button>
                </div>
              {/each}
            </div>

          {:else}
            <!-- ✅ 라디오 선택(단일) -->
            <fieldset class="mt-5 space-y-2.5">
              <legend class="sr-only">선택지</legend>

              {#each (q as any).options as opt (opt.value)}
                <label
                  class={[
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 shadow-sm transition",
                    "bg-zinc-50 border-zinc-200 hover:bg-white",
                    "dark:bg-zinc-950/40 dark:border-zinc-800 dark:hover:bg-zinc-950/70",
                    selectedValue === opt.value
                      ? "border-emerald-400/70 bg-emerald-50 ring-2 ring-emerald-200/70 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                      : "ring-0",
                  ].join(" ")}
                >
                  <input
                    class="mt-0.5 h-5 w-5"
                    type="radio"
                    name={q.id}
                    value={opt.value}
                    checked={selectedValue === opt.value}
                    on:change={(e) => select((e.currentTarget as HTMLInputElement).value)}
                  />

                  <div class="min-w-0">
                    <div class="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
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
          {/if}

          <div class="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <!-- svelte-ignore element_invalid_self_closing_tag -->
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {#if step < total - 1}
              <span>선택/입력 후 ‘다음’ 버튼을 눌러 진행해줘</span>
            {:else}
              <span>선택/입력 후 ‘분석 시작’ 버튼을 눌러 결과를 확인해줘</span>
            {/if}
          </div>
        </section>

        <!-- ✅ 결과 미리보기 힌트(마지막 페이지에서만) -->
        {#if canShowPreview}
          <div
            class="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="flex items-start gap-3">
              <div
                class="mt-0.5 h-9 w-9 shrink-0 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 shadow-sm"
              ></div>
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
                  {#each pick.reasons as r, i (`${r.tag}-${i}`)}
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
                    추천 루틴
                    ({Math.round(
                      pick.routine.steps.reduce((acc, s) => acc + (s.seconds ?? 0), 0) / 60
                    )}분 · {pick.routine.level})
                  </div>
                  <span class="text-xs text-zinc-500 dark:text-zinc-400" title="내 답변에 따라 자동 구성">
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
                        <span class="truncate text-sm font-semibold">{s.title}</span>
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
                      <li class="text-xs text-amber-900 dark:text-amber-200">• {w.text}</li>
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
            <!-- 
            <div class="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              {$recoState.data.meta.explain}
            </div>
            -->
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
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold
                              bg-emerald-600 text-white shadow-sm hover:bg-emerald-500
                              dark:bg-emerald-500/90 dark:hover:bg-emerald-500"
                        on:click={() => playAlternative(alt)}
                        aria-label="대안 루틴 재생"
                        title="재생"
                      >
                        ▶ <span class="hidden sm:inline">플레이</span>
                      </button>
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
    <footer class="sticky bottom-0 mt-5 pb-4 pt-3 bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-950">
      {#if step < total - 1}
        <button
          class="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-4 text-base font-extrabold
                 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] disabled:opacity-50"
          on:click={goNext}
          disabled={!hasSelection}
        >
          다음
        </button>
      {:else}
        {#if !showResults}
          <button
            class="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-4 text-base font-extrabold
                   text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] disabled:opacity-50"
            on:click={submit}
            disabled={!hasSelection}
          >
            {mode === "program" ? "플레이 시작" : "분석 시작"}
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

      <!-- // 루틴 플레이어 모달 -->
      <WorkoutPlayerModal
        open={playerOpen}
        title={playerTitle}
        steps={playerSteps}
        warnings={playerWarnings}
        onClose={() => (playerOpen = false)}
      />
    </footer>
  </div>

  <!-- 미리보기 모달 -->
  {#if previewOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" on:click={closePreview}>
      <div
        class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
        transition:fade
        on:click|stopPropagation
      >
        <div class="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div class="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 truncate">
            {previewTitle}
          </div>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm
                  hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-950/60"
            on:click={closePreview}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div class="p-4">
          {#if previewImg}
            <img
              src={previewImg}
              alt={previewTitle}
              class="w-full rounded-xl border border-zinc-200 bg-zinc-50 object-contain dark:border-zinc-800 dark:bg-zinc-950/30"
            />
          {:else}
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300">
              미리보기 이미지가 없어요.
            </div>
          {/if}

          <div class="mt-4">
            <button
              class="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-extrabold text-white"
              on:click={closePreview}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

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
