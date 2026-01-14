// src/lib/ui/theme.ts
import { writable } from "svelte/store";
import { browser } from "$app/environment";

export type Theme = "light" | "dark" | "system";
export const THEME_KEY = "hams-health:theme:v1";

function getSystemIsDark() {
  if (!browser) return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function applyTheme(theme: Theme) {
  if (!browser) return;

  const isDark = theme === "dark" || (theme === "system" && getSystemIsDark());
  document.documentElement.classList.toggle("dark", isDark);
}

function loadTheme(): Theme {
  if (!browser) return "system";
  const t = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
  return t === "light" || t === "dark" || t === "system" ? t : "system";
}

export const theme = writable<Theme>(loadTheme());

// 최초 적용 + 변경 시 반영
if (browser) {
  const t = loadTheme();
  applyTheme(t);

  // system 모드일 때 OS 테마 변경 반영
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    let current: Theme = "system";
    theme.subscribe((v) => (current = v))(); // 즉시 unsubscribe
    if (current === "system") applyTheme("system");
  };
  mq.addEventListener?.("change", onChange);

  theme.subscribe((t2) => {
    localStorage.setItem(THEME_KEY, t2);
    applyTheme(t2);
  });
}
