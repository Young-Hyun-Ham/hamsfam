<!-- src/routes/+page.svelte -->
<script lang="ts">
  // Capacitor/웹 모두에서 안전하게: 링크 이동은 a로 처리해도 되고 goto 써도 됨
  import { onMount } from "svelte";

  type ThemeMode = "light" | "dark";
  const THEME_KEY = "hams:theme";
  let mode: ThemeMode = "light";

  function applyTheme(next: ThemeMode) {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  function toggleTheme() {
    mode = mode === "dark" ? "light" : "dark";
    applyTheme(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
  }

  onMount(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark") {
        mode = saved;
      } else {
        mode = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
      }
    } catch {}
    applyTheme(mode);
  });
</script>

<div
  class="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(59,130,246,0.20),transparent_60%),radial-gradient(900px_circle_at_90%_0%,rgba(168,85,247,0.18),transparent_55%),radial-gradient(900px_circle_at_40%_110%,rgba(16,185,129,0.16),transparent_55%)] 
         bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
>
  <!-- Top -->
  <header class="mx-auto max-w-6xl px-5 pt-10">
    <div class="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <div class="space-y-3">
        <div class="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium ring-1 ring-black/5 backdrop-blur
                    dark:bg-slate-900/50 dark:ring-white/10">
          <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          <span class="text-slate-700 dark:text-slate-200">Hams Chat · SvelteKit</span>
          <span class="text-slate-400">•</span>
          <span class="text-slate-600 dark:text-slate-300">AI와 대화 가능한 채팅</span>
        </div>

        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          대화가 곧 <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-600">업무 흐름</span>가 되는
          채팅
        </h1>

        <p class="max-w-2xl text-pretty text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          친구와 채팅하고, 필요하면 AI를 불러 함께 정리하고 계획하세요.
          라이트/다크 모드, 모바일(추후 Capacitor)까지 고려한 UI로 설계합니다.
        </p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/ai-chat"
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]
                   ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0
                   dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <span class="text-lg leading-none">💬</span>
            채팅 시작
            <span class="text-white/70 dark:text-slate-600">→</span>
          </a>

          <a
            href="/ai-chat"
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/60 px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-black/5 backdrop-blur
                   transition hover:-translate-y-0.5 hover:bg-white/80 active:translate-y-0
                   dark:bg-slate-900/50 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-900/70"
          >
            <span class="text-lg leading-none">✨</span>
            AI 대화로 바로 시작
          </a>

          <!-- ✅ 같은 크기의 토글 버튼 -->
          <button
            type="button"
            on:click={toggleTheme}
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/60 px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-black/5 backdrop-blur
                  transition hover:-translate-y-0.5 hover:bg-white/80 active:translate-y-0
                  dark:bg-slate-900/50 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-900/70"
            aria-label="테마 전환"
            title={mode === "dark" ? "라이트 모드로" : "다크 모드로"}
          >
            <span class="text-lg leading-none">{mode === "dark" ? "☀" : "🌙"}</span>
            <span class:text-xs={mode === "dark"}>{mode === "dark" ? "라이트모드" : "다크모드"}</span>
          </button>
          <!--           
          <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span class="rounded-full bg-white/60 px-2 py-1 ring-1 ring-black/5 dark:bg-slate-900/50 dark:ring-white/10">Firebase</span>
            <span class="rounded-full bg-white/60 px-2 py-1 ring-1 ring-black/5 dark:bg-slate-900/50 dark:ring-white/10">Lucia</span>
            <span class="rounded-full bg-white/60 px-2 py-1 ring-1 ring-black/5 dark:bg-slate-900/50 dark:ring-white/10">Tailwind</span>
          </div>
          -->
        </div>
      </div>

      <!-- Preview Card -->
      <div class="w-full max-w-xl">
        <div
          class="rounded-3xl bg-white/70 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.14)] ring-1 ring-black/5 backdrop-blur
                 dark:bg-slate-900/40 dark:ring-white/10"
        >
          <div class="flex items-center justify-between px-2 pb-3">
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 rounded-2xl bg-slate-900/10 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                <img src="/logo.svg" alt="HC" class="h-full w-full p-1" />
              </div>
              <div class="leading-tight">
                <div class="text-sm font-semibold">AI Chat</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Preview</div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span class="text-xs text-slate-500 dark:text-slate-400">온라인</span>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-slate-950/60 dark:ring-white/10">
            <!-- bubbles -->
            <div class="flex justify-start">
              <div class="max-w-[78%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-black/5
                          dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10">
                오늘 할 일 정리 좀 도와줘!
              </div>
            </div>

            <div class="flex justify-end">
              <div class="max-w-[78%] rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white shadow-sm
                          dark:bg-white dark:text-slate-950">
                좋아. 우선 우선순위 3개만 뽑아볼까?
              </div>
            </div>

            <div class="flex justify-start">
              <div class="max-w-[78%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-black/5
                          dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10">
                1) 배포 오류 수정, 2) 채팅 UI 개선, 3) 인증 붙이기!
              </div>
            </div>

            <div class="flex justify-end">
              <div class="max-w-[78%] rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white shadow-sm
                          dark:bg-white dark:text-slate-950">
                OK. “배포 오류 수정”부터 체크리스트로 쪼개줄게 ✅
              </div>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <div class="h-9 flex-1 rounded-2xl bg-slate-100 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"></div>
              <div class="grid h-9 w-10 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">↵</div>
            </div>
          </div>
        </div>
        <!-- 
        <div class="mt-4 grid grid-cols-3 gap-3">
          <div class="rounded-2xl bg-white/60 p-3 ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/40 dark:ring-white/10">
            <div class="text-xs text-slate-500 dark:text-slate-400">응답</div>
            <div class="mt-1 text-lg font-semibold">빠르게</div>
          </div>
          <div class="rounded-2xl bg-white/60 p-3 ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/40 dark:ring-white/10">
            <div class="text-xs text-slate-500 dark:text-slate-400">모드</div>
            <div class="mt-1 text-lg font-semibold">Light / Dark</div>
          </div>
          <div class="rounded-2xl bg-white/60 p-3 ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/40 dark:ring-white/10">
            <div class="text-xs text-slate-500 dark:text-slate-400">확장</div>
            <div class="mt-1 text-lg font-semibold">Capacitor</div>
          </div>
        </div>
        -->
      </div>
    </div>
  </header>

  <!-- Features -->
  <main class="mx-auto max-w-6xl px-5 pb-16 pt-12">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-3xl bg-white/60 p-6 ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/40 dark:ring-white/10">
        <div class="text-2xl">🧠</div>
        <div class="mt-3 text-base font-semibold">AI와 함께 대화</div>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          채팅 흐름 중에 AI를 호출해서 요약/정리/추천을 즉시 받을 수 있어요.
        </p>
      </div>

      <div class="rounded-3xl bg-white/60 p-6 ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/40 dark:ring-white/10">
        <div class="text-2xl">🔐</div>
        <div class="mt-3 text-base font-semibold">인증/세션 준비</div>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Lucia 기반 사용자 인증과 세션 관리를 붙이기 쉬운 구조로 확장합니다.
        </p>
      </div>

      <div class="rounded-3xl bg-white/60 p-6 ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/40 dark:ring-white/10">
        <div class="text-2xl">📱</div>
        <div class="mt-3 text-base font-semibold">모바일까지 고려</div>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          추후 Capacitor로 iOS/Android 앱 변환을 염두에 두고 UI/라우팅을 구성합니다.
        </p>
      </div>
    </div>

    <!-- Bottom CTA -->
    <div class="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl bg-white/60 p-6 ring-1 ring-black/5 backdrop-blur
                dark:bg-slate-900/40 dark:ring-white/10 md:flex-row md:items-center">
      <div>
        <div class="text-base font-semibold">지금 바로 대화를 시작할까요?</div>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          “채팅 시작”을 누르면 <span class="font-mono text-xs">/ai-chat</span> 으로 이동합니다.
        </p>
      </div>
      <a
        href="/ai-chat"
        class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm
               transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0
               dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
      >
        <span class="text-lg leading-none">🚀</span>
        채팅 시작
      </a>
    </div>
  </main>

  <footer class="mx-auto max-w-6xl px-5 pb-10 text-xs text-slate-500 dark:text-slate-400">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span>© {new Date().getFullYear()} Hams Chat</span>
      <span class="opacity-80">SvelteKit · Tailwind · Firebase · (AI)</span>
    </div>
  </footer>
</div>
