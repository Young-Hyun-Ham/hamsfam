<!-- src/lib/ai-chat/components/ChatShell.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import LeftRail from "./LeftRail.svelte";
  import ListPanel from "./ListPanel.svelte";
  import ChatWindow from "./ChatWindow.svelte";
  import { chatUI } from "../stores/chatUI";

  // ✅ SSR 안전: window/matchMedia는 onMount에서만
  let isDesktop = true;

  onMount(() => {
    const mq = window.matchMedia("(min-width: 768px)"); // tailwind md
    const apply = () => (isDesktop = mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  });
</script>

<div class="mx-auto h-full max-w-6xl">
  <div
    class="flex h-full overflow-hidden rounded-3xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
  >
    <!-- 좌측: 레일 + (열려있으면) 목록 -->
    <div class="flex h-full shrink-0">
      <LeftRail />

      {#if !$chatUI.leftCollapsed}
        <div class="w-[320px] border-r border-black/5 bg-white">
          <ListPanel />
        </div>
      {/if}
    </div>

    <!-- 우측: 채팅 패널 -->
    <div class="min-w-0 flex-1 bg-[#c7d7e6]">
      {#if isDesktop}
        <!-- ✅ PC: 기존 그대로 -->
        <ChatWindow />
      {:else}
        <!-- ✅ Mobile: 좌측이 열려있으면 채팅을 숨기고 '아이콘만' 노출 -->
        {#if !$chatUI.leftCollapsed}
          <div class="h-full">
            <!-- 상단: 현재 채팅 상대 아이콘(=접기 버튼)만 -->
            <div class="flex items-center px-4 py-3">
              <!-- svelte-ignore element_invalid_self_closing_tag -->
              <button
                type="button"
                aria-label="채팅 화면으로 돌아가기"
                class="h-11 w-11 rounded-2xl bg-white/60 shadow-sm ring-1 ring-black/5 active:scale-[0.98]"
                on:click={() => chatUI.toggleLeftCollapsed()}
              />
            </div>

            <!-- 하늘색 껍데기 영역 (내용 비움) -->
            <!-- svelte-ignore element_invalid_self_closing_tag -->
            <div class="h-[calc(100%-56px)]" />
          </div>
        {:else}
          <ChatWindow />
        {/if}
      {/if}
    </div>
  </div>
</div>
