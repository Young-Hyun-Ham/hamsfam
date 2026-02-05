<!-- src/lib/components/AppShell.svelte -->
<script lang="ts">
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
</script>

<div class="app">
  <header class="topbar">
    <div class="brand">
      <div class="logo">
        <a class="logo" style="text-decoration:none;" href="/">HS</a>
      </div>
      <div class="titles">
        <div class="t1">Hams Stock</div>
        <div class="t2">보유주식 관리 및 실시간 주식 정보</div>
      </div>
    </div>

    <nav class="nav">
      <a class="link" href="/watch">감시등록</a>
      <a class="link" href="/signals">시그널</a>
      <ThemeToggle />
    </nav>
  </header>

  <main class="main">
    <slot />
  </main>

  <footer class="footer">
    <span class="muted">v0 • Python Worker + Firestore Realtime</span>
  </footer>
</div>
<style>
  /* =========================
   * Design Tokens (Light/Dark)
   * ========================= */
  :global(:root) {
    --bg: #f6f7fb;
    --panel: rgba(255, 255, 255, 0.82);
    --panel2: rgba(255, 255, 255, 0.92);
    --text: #0f172a;
    --muted: rgba(15, 23, 42, 0.55);
    --border: rgba(15, 23, 42, 0.10);
    --shadow: 0 18px 60px rgba(2, 6, 23, 0.10);
    --brand: #2563eb;
    --ring: 0 0 0 4px rgba(37, 99, 235, 0.16);

    --radius: 18px;

    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;

    /* header/footer */
    --header-h: 64px;
    --header-h-sm: 56px;
    --header-h-use: var(--header-h);
    --footer-h: 52px;

    /* Capacitor safe-area */
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  :global(html[data-theme="dark"]) {
    --bg: #070a12;
    --panel: rgba(15, 23, 42, 0.55);
    --panel2: rgba(15, 23, 42, 0.72);
    --text: rgba(226, 232, 240, 0.96);
    --muted: rgba(226, 232, 240, 0.58);
    --border: rgba(226, 232, 240, 0.10);
    --shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
    --brand: #60a5fa;
    --ring: 0 0 0 4px rgba(96, 165, 250, 0.20);
  }

  :global(html, body) {
    height: 100%;
  }

  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      Segoe UI,
      Roboto,
      "Noto Sans KR",
      sans-serif;
  }

  /* =========================
   * Layout Grid
   * ========================= */
  .app {
    min-height: 100dvh;
    display: grid;
    grid-template-rows:
      calc(var(--header-h-use) + var(--safe-top))
      1fr
      calc(var(--footer-h) + var(--safe-bottom));
  }

  /* =========================
   * Topbar (Header)
   * ========================= */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 30;

    padding-top: var(--safe-top);
    height: calc(var(--header-h-use) + var(--safe-top));

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: var(--space-4);
    padding-inline: var(--space-6);

    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(14px);

    background: linear-gradient(to bottom, var(--panel2), rgba(255, 255, 255, 0));
    overflow: visible; /* ✅ nav가 밀려 사라져 보이는 현상 방지 */
  }

  :global(html[data-theme="dark"]) .topbar {
    background: linear-gradient(to bottom, rgba(2, 6, 23, 0.85), rgba(2, 6, 23, 0));
  }

  /* brand 영역이 커져도 nav를 밀어내지 않도록 */
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;

    min-width: 0;
    flex: 1 1 auto; /* ✅ brand는 줄어들 수 있어야 nav가 살아남음 */
  }

  .logo {
    width: 38px;
    height: 38px;

    display: grid;
    place-items: center;

    border-radius: 14px;
    background: var(--brand);
    color: #fff;

    font-weight: 900;
    text-decoration: none;
    box-shadow: var(--shadow);

    flex: 0 0 auto;
  }

  .titles {
    min-width: 0;
    overflow: hidden; /* ✅ title이 길어져도 nav를 밀지 않게 */
  }

  .t1 {
    font-weight: 800;
    letter-spacing: -0.02em;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; /* ✅ 말줄임 */
  }

  .t2 {
    margin-top: 2px;
    font-size: 12px;
    color: var(--muted);

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 10px;

    flex: 0 0 auto;          /* ✅ nav는 절대 줄어들지 않게 */
    min-width: max-content;  /* ✅ nav가 사라지는 느낌 방지 */
  }

  .link {
    font-size: 13px;
    color: var(--muted);
    text-decoration: none;

    padding: 8px 10px;
    border-radius: 12px;

    transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    white-space: nowrap; /* ✅ 줄바꿈 금지 */
  }

  .link:hover {
    background: var(--panel);
    color: var(--text);
  }

  .link:focus-visible {
    outline: none;
    box-shadow: var(--ring);
  }

  /* =========================
   * Main
   * ========================= */
  .main {
    padding: var(--space-6);
    padding-bottom: calc(var(--space-6) + var(--safe-bottom));

    min-width: 0;       /* ✅ 페이지마다 레이아웃이 달라 보이는 현상 방지 */
    overflow-x: hidden; /* ✅ 모바일 가로 밀림 방지 */
  }

  /* =========================
   * Footer
   * ========================= */
  .footer {
    height: calc(var(--footer-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);

    display: flex;
    align-items: center;

    padding-inline: var(--space-6);
    background: var(--panel2);

    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 12px;
  }

  .muted {
    opacity: 0.92;
  }

  /* =========================
   * Responsive
   * ========================= */
  @media (max-width: 720px) {
    :global(:root) {
      --header-h-use: var(--header-h-sm);
    }

    .topbar {
      padding-inline: var(--space-4);
      gap: var(--space-3);
    }

    .logo {
      width: 34px;
      height: 34px;
      border-radius: 12px;
    }

    .t1 {
      font-size: 14px;
    }

    .t2 {
      display: none;
    }

    .brand {
      gap: 10px;
    }
  }

  @media (max-width: 520px) {
    .topbar {
      padding-inline: 12px;
    }

    .nav {
      gap: 6px;
    }

    .link {
      font-size: 12px;
      padding: 6px 8px;
    }

    /* ✅ 아주 좁을 때 title 폭을 제한해서 nav 확보 */
    .t1 {
      max-width: 140px;
    }
  }
</style>
