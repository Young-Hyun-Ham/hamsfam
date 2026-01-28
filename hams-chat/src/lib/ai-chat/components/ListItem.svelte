<script lang="ts">
  export let title: string;
  export let subtitle: string;
  export let time: string | undefined = undefined;
  export let badge: number | undefined = undefined;
  export let selected: boolean | undefined = undefined;
  export let muted: boolean | undefined = undefined;
  export let onClick: (() => void) | undefined = undefined;

  $: badgeText = badge && badge > 0 ? (badge > 300 ? "300+" : String(badge)) : "";
</script>

<button
  type="button"
  on:click={() => onClick?.()}
  class={[
    "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
    selected ? "bg-black/5" : "hover:bg-black/3",
  ].join(" ")}
>
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <div class="h-11 w-11 shrink-0 rounded-2xl bg-black/10" />

  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <div class="truncate text-[14px] font-semibold text-slate-900">{title}</div>
      {#if muted}
        <span class="text-[12px] text-slate-400">🔇</span>
      {/if}
    </div>
    <div class="truncate text-[13px] text-slate-600">{subtitle}</div>
  </div>

  <div class="flex shrink-0 flex-col items-end gap-1">
    {#if time}
      <div class="text-[12px] text-slate-400">{time}</div>
    {/if}
    {#if badgeText}
      <div class="rounded-full bg-orange-500 px-2 py-0.5 text-[12px] font-semibold text-white">
        @{badgeText}
      </div>
    {/if}
  </div>
</button>
