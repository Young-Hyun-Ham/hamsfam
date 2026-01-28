<!-- src/routes/ai-chat/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import ChatShell from "$lib/ai-chat/components/ChatShell.svelte";
  import { chatEngine } from "$lib/ai-chat/stores/chatEngine";
  import sample from "$lib/ai-chat/sample.json";

  onMount(() => {
    chatEngine.setScenario(sample.nodes, sample.edges);
  });
</script>

<!-- <div class="h-[calc(100dvh-64px)] px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3"> -->
<div class="h-[calc(100dvh-0px)] px-4 pb-3 pt-3 md:px-6 md:pb-6 md:pt-3">
  <ChatShell />
</div>

