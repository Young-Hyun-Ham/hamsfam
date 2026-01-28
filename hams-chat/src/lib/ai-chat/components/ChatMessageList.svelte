<script lang="ts">
  import type { ChatMessage } from "../types";
  import ChatMessageBubble from "./ChatMessageBubble.svelte";

  export let messages: ChatMessage[] = [];
</script>

<div class="space-y-2">
  {#each messages as m (m.id)}
    <ChatMessageBubble msg={m} />
  {/each}
</div>
