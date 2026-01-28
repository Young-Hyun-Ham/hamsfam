<script lang="ts">
  type Action = { key: string; label: string };
  export let title: string;
  export let subtitle: string | undefined = undefined;
  export let actions: Action[] = [];
</script>

<div class="flex items-center justify-between px-4 py-3">
  <div class="flex items-center gap-3">
    <!-- svelte-ignore element_invalid_self_closing_tag -->
    <div class="h-11 w-11 rounded-2xl bg-white/60 shadow-sm ring-1 ring-black/5" />
    <div class="leading-tight">
      <div class="text-[15px] font-semibold text-slate-900">{title}</div>

      {#if subtitle}
        <div class="mt-0.5 flex items-center gap-1 text-xs text-slate-700/80">
          <!-- svelte-ignore element_invalid_self_closing_tag -->
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-slate-700/50" />
          <span>{subtitle}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex items-center gap-2">
    {#each actions as a (a.key)}
      <button
        type="button"
        aria-label={a.label}
        class="grid h-9 w-9 place-items-center rounded-xl bg-white/50 shadow-sm ring-1 ring-black/5 transition hover:bg-white/70"
      >
        <span class="text-slate-800/70">
          {a.key === "search" ? "⌕" : a.key === "call" ? "✆" : a.key === "video" ? "▣" : "≡"}
        </span>
      </button>
    {/each}
  </div>
</div>
