<script lang="ts">
  import { 
    SidebarToggleIconA, 
    SidebarToggleIconB, 
    SidebarToggleIconC,
    SidebarToggleIconD,
    GearIcon,
  } from "../icons";
  import { chatUI } from "../stores/chatUI";
  import type { LeftTab } from "../types";

  function clickTab(t: LeftTab) {
    chatUI.setLeftTab(t);
    if ($chatUI.leftCollapsed) chatUI.toggleLeftCollapsed();
  }

  function railClass(active?: boolean) {
    return [
      "relative grid h-11 w-11 place-items-center rounded-2xl transition",
      active ? "bg-black/90 text-white shadow-sm" : "text-black/60 hover:bg-black/5",
    ].join(" ");
  }
</script>

<div class="flex h-full w-[72px] flex-col items-center justify-between bg-black/[0.03] py-3">
  <div class="flex flex-col items-center gap-2">
    <!-- svelte-ignore element_invalid_self_closing_tag -->
    <div class="h-11 w-11 rounded-2xl bg-black/10" >
      <a href="/" aria-label="메인으로" title="메인으로">
        <img src="/logo.svg" alt="HC" class="h-full w-full p-1" />
      </a>
    </div>

    <div class="mt-2 flex flex-col gap-2">
      <button type="button" class={railClass($chatUI.leftTab === "friends")} on:click={() => clickTab("friends")}>
        <span class="text-lg">👤</span>
      </button>

      <button type="button" class={railClass($chatUI.leftTab === "chats")} on:click={() => clickTab("chats")}>
        <span class="text-lg">💬</span>
        <span class="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">1+</span>
      </button>

      <button type="button" class={railClass($chatUI.leftTab === "more")} on:click={() => clickTab("more")}>
        <span class="text-lg">⋯</span>
      </button>
    </div>
  </div>

  <div class="flex flex-col items-center gap-2">
    <button
      type="button"
      on:click={() => chatUI.toggleLeftCollapsed()}
      class="grid h-11 w-11 place-items-center rounded-2xl text-black/60 hover:bg-black/5"
      aria-label="목록 접기/펼치기"
      title="목록 접기/펼치기"
    >
      {@html SidebarToggleIconA({ collapsed: $chatUI.leftCollapsed })}
    </button>

    <button type="button" class="grid h-11 w-11 place-items-center rounded-2xl text-black/60 hover:bg-black/5" aria-label="설정">
      <span class="text-lg">⚙️</span>
    </button>
    <!-- <button
      type="button"
      class="relative grid h-11 w-11 place-items-center rounded-2xl transition
        ring-1 ring-black/5 shadow-sm active:scale-[0.98]
        bg-white/70 text-black/70 hover:bg-white hover:text-black/80"
      aria-label="설정"
    >
      {@html GearIcon({ size: 20 })}
    </button> -->
  </div>
</div>
