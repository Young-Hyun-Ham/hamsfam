<script lang="ts">
  import { onMount } from "svelte";

  type Mode = "light" | "dark";
  let mode: Mode = "light";

  function apply(m: Mode) {
    mode = m;
    document.documentElement.dataset.theme = m;
    localStorage.setItem("hams:theme", m);
  }

  function toggle() {
    apply(mode === "dark" ? "light" : "dark");
  }

  onMount(() => {
    const saved = localStorage.getItem("hams:theme") as Mode | null;
    if (saved === "dark" || saved === "light") return apply(saved);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    apply(prefersDark ? "dark" : "light");
  });
</script>

<button class="btn" on:click={toggle} aria-label="toggle theme">
  <span class="dot" aria-hidden="true" />
  <span class="label">{mode === "dark" ? "라이트" : "다크"}</span>
</button>

<style>
  .btn{
    height: 36px;
    border-radius: 14px;
    padding: 0 12px;
    border: 1px solid var(--border);
    background: var(--panel);
    color: var(--text);
    display:flex; align-items:center; gap: 10px;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(0,0,0,0.06);
  }
  .btn:hover{ box-shadow: 0 12px 34px rgba(0,0,0,0.10); }
  .btn:focus{ outline: none; box-shadow: var(--ring); }

  .dot{
    width: 10px; height: 10px;
    border-radius: 999px;
    background: var(--brand);
  }
  .label{
    font-size: 12px;
    color: var(--muted);
    font-weight: 700;
    letter-spacing: -0.01em;
  }
</style>
