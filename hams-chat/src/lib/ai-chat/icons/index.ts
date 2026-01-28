// src/lib/ai-chat/icons/sidebar.ts

export function SidebarToggleIconA({ collapsed, size = 20 }: { collapsed: boolean; size?: number }) {
  if (collapsed) {
    // open: sidebar + hamburger
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect x="3" y="4" width="7" height="16" rx="2" stroke="currentColor" stroke-width="1.8" opacity="0.7"/>
  <path d="M13 8h8M13 12h8M13 16h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
  }
  // close: sidebar + X
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect x="3" y="4" width="7" height="16" rx="2" stroke="currentColor" stroke-width="1.8" opacity="0.7"/>
  <path d="M14.5 9.5l6 6M20.5 9.5l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
}

export function SidebarToggleIconB({ collapsed, size = 20 }: { collapsed: boolean; size?: number }) {
  if (collapsed) {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <path d="M10 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
</svg>`;
  }
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <path d="M14 7l-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 7l-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
</svg>`;
}

export function SidebarToggleIconC({ collapsed, size = 20 }: { collapsed: boolean; size?: number }) {
  if (collapsed) {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" stroke-width="1.8" opacity="0.75"/>
  <path d="M9 8v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
  <path d="M13 9l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  }
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" stroke-width="1.8" opacity="0.75"/>
  <path d="M9 8v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
  <path d="M16 9l-3 3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

export function SidebarToggleIconD({
  collapsed,
  size = 22,
  stroke = 2,
}: {
  collapsed: boolean; // true: 접힘(펼치기 아이콘 보여줌), false: 열림(접기 아이콘)
  size?: number;
  stroke?: number;
}) {
  // collapsed === true  → "펼치기" (arrow-bar-right)
  // collapsed === false → "접기"   (arrow-bar-left)

  if (collapsed) {
    // arrow-bar-right
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <path d="M16 4v16" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>
  <path d="M10 8l4 4-4 4" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  }

  // arrow-bar-left
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <path d="M8 4v16" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>
  <path d="M14 8l-4 4 4 4" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// 톱니바퀴 옵션 아이콘
export function GearIcon({ size = 20 }: { size?: number }) {
  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${size}" height="${size}"
     viewBox="0 0 16 16"
     fill="currentColor"
     aria-hidden="true" focusable="false">
  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52z"/>
</svg>`;
}
