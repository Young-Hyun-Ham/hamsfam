<script lang="ts">
  import { chatUI } from "../stores/chatUI";
  import ListItem from "./ListItem.svelte";
</script>

<div class="space-y-1">
  {#if $chatUI.rooms.length === 0}
    <div class="px-3 py-2 text-[12px] text-slate-500/80">채팅 내용이 없습니다.</div>
  {:else}
    {#each $chatUI.rooms as r (r.id)}
      <ListItem
        title={r.title}
        subtitle={r.lastMessage}
        time={r.time}
        badge={r.unread}
        muted={r.muted}
        selected={r.id === $chatUI.selectedRoomId}
        onClick={() => chatUI.selectRoom(r.id)}
      />
    {/each}
  {/if}
</div>
