<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { onMount } from "svelte";
  import { theme } from "$lib/ui/theme";

  let { children } = $props();

  onMount(() => {
    // ✅ theme store를 구독해서 로컬스토리지 값 읽기/DOM 적용이 반드시 일어나게 함
    const unsub = theme.subscribe(() => {});
    return () => unsub();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
