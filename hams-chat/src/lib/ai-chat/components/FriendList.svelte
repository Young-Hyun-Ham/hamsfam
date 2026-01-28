<script lang="ts">
  import { chatUI } from "../stores/chatUI";
  import ListItem from "./ListItem.svelte";
</script>

<div class="space-y-1">
  {#if $chatUI.friends.length === 0}
    <div class="px-3 py-2 text-[12px] text-slate-500/80">친구가 없습니다.</div>
  {:else}
    {#each $chatUI.friends as f (f.id)}
      <ListItem title={f.name} subtitle={f.status ?? ""} />
    {/each}
  {/if}
</div>
