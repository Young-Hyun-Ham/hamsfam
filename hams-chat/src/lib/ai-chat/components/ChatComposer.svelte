 <!-- src/lib/ai-chat/components/ChatComposer.svelte -->

<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy } from "svelte";
  import type { ComposerMenuKey } from "../types";

  export let onSend: (text: string) => void;
  export let onMenuSelect: ((key: ComposerMenuKey) => void) | undefined = undefined;
  export let chatbotEnabled: boolean;
  export let onToggleChatbot: (next: boolean) => void;

  let text = "";
  let menuOpen = false;

  let wrapEl: HTMLDivElement | null = null;

  function submit() {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    text = "";
  }

  function toggleChatbot() {
    const next = !chatbotEnabled;
    onToggleChatbot(next);
    menuOpen = false;
  }

  function selectMenu(key: ComposerMenuKey) {
    menuOpen = false;
    onMenuSelect?.(key);
  }

  function onDocMouseDown(e: MouseEvent) {
    if (!menuOpen) return;
    const el = wrapEl;
    if (!el) return;
    if (!el.contains(e.target as Node)) menuOpen = false;
  }

  function onDocKeyDown(e: KeyboardEvent) {
    if (!menuOpen) return;
    if (e.key === "Escape") menuOpen = false;
  }

  $: if (browser) {
    if (menuOpen) {
      window.addEventListener("mousedown", onDocMouseDown);
      window.addEventListener("keydown", onDocKeyDown);
    } else {
      window.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onDocKeyDown);
    }
  }

  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener("mousedown", onDocMouseDown);
    window.removeEventListener("keydown", onDocKeyDown);
  });
</script>

<div bind:this={wrapEl} class="relative flex items-end gap-2 px-3 py-2">
  <button
    type="button"
    on:click={() => (menuOpen = !menuOpen)}
    class="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
    aria-label="추가"
    title="추가"
  >
    +
  </button>

  {#if menuOpen}
    <div class="absolute bottom-[64px] left-3 z-50 w-80 overflow-hidden rounded-2xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] ring-1 ring-black/10">
      <div class="px-3 py-2 text-[12px] font-semibold text-slate-700/80">추가 메뉴</div>
      <!-- svelte-ignore element_invalid_self_closing_tag -->
      <div class="h-px bg-black/5" />

      <button
        type="button"
        on:click={toggleChatbot}
        class="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-black/[0.03]"
      >
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-black/5">🤖</span>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <div class="truncate text-[13px] font-semibold text-slate-900">chatbot</div>
            <span
              class={[
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                chatbotEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {chatbotEnabled ? "실행중" : "종료됨"}
            </span>
          </div>
          <div class="truncate text-[12px] text-slate-600">
            {chatbotEnabled ? "클릭하면 종료" : "클릭하면 실행"}
          </div>
        </div>

        <span
          aria-hidden="true"
          class={[
            "relative h-6 w-11 rounded-full transition",
            chatbotEnabled ? "bg-emerald-500" : "bg-slate-300",
          ].join(" ")}
        >
          <!-- svelte-ignore element_invalid_self_closing_tag -->
          <span
            class={[
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
              chatbotEnabled ? "left-[22px]" : "left-0.5",
            ].join(" ")}
          />
        </span>
      </button>

      <div class="px-3 py-2 text-[11px] text-slate-500">ESC 또는 바깥 클릭으로 닫기</div>
    </div>
  {/if}

  <div class="flex min-h-[44px] flex-1 items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
    <!-- svelte-ignore element_invalid_self_closing_tag -->
    <textarea
      bind:value={text}
      placeholder="메시지 입력"
      rows={1}
      class="max-h-28 min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-[13px] outline-none"
      on:keydown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      }}
    />
  </div>

  <button
    type="button"
    on:click={submit}
    class="h-10 rounded-2xl bg-slate-900 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.99]"
  >
    전송
  </button>
</div>
