<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "./layout.css";
  import { onMount } from "svelte";

  let { children } = $props();

  type ThemeMode = "light" | "dark";
  const THEME_KEY = "hams:theme";

  function applyTheme(mode: ThemeMode) {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", mode === "dark");
  }

  onMount(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark") {
        applyTheme(saved);
      }
    } catch {}
  });
</script>

{@render children()}
