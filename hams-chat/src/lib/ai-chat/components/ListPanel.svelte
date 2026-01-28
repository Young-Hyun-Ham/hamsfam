<script lang="ts">
  import { chatUI } from "../stores/chatUI";
  import ChatList from "./ChatList.svelte";
  import FriendList from "./FriendList.svelte";

  $: title = $chatUI.leftTab === "friends" ? "친구" : $chatUI.leftTab === "chats" ? "채팅" : "더보기";
</script>

<div class="flex h-full flex-col">
  <div class="flex items-center justify-between px-4 py-3">
    <div class="text-lg font-semibold text-slate-900">{title}</div>

    <div class="flex items-center gap-2">
      <button class="grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10">⌕</button>
      <button class="grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-black/60 hover:bg-black/10">＋</button>
    </div>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
    {#if $chatUI.leftTab === "friends"}
      <FriendList />
    {:else if $chatUI.leftTab === "chats"}
      <ChatList />
    {:else}
      <div class="px-2 py-2 text-sm text-slate-600">더보기 메뉴(공지/설정/파일 등) 영역</div>
    {/if}
  </div>
</div>
