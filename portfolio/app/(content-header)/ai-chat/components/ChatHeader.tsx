// app/(content-header)/ai-chat/components/ChatHeader.tsx
"use client";

type Action = { key: string; label: string };

export default function ChatHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions: Action[];
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-white/60 shadow-sm ring-1 ring-black/5" />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-700/80">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-700/50" />
              <span>{subtitle}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-label={a.label}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/50 shadow-sm ring-1 ring-black/5 transition hover:bg-white/70"
          >
            {/* 아이콘 대신 심플 glyph */}
            <span className="text-slate-800/70">
              {a.key === "search" ? "⌕" : a.key === "call" ? "✆" : a.key === "video" ? "▣" : "≡"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
