// app/(content-header)/ai-chat/components/ListItem.tsx
"use client";

export default function ListItem({
  title,
  subtitle,
  time,
  badge,
  selected,
  muted,
  onClick,
}: {
  title: string;
  subtitle: string;
  time?: string;
  badge?: number;
  selected?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  const badgeText =
    badge && badge > 0 ? (badge > 300 ? "300+" : String(badge)) : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
        selected ? "bg-black/5" : "hover:bg-black/3",
      ].join(" ")}
    >
      <div className="h-11 w-11 shrink-0 rounded-2xl bg-black/10" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[14px] font-semibold text-slate-900">
            {title}
          </div>
          {muted ? <span className="text-[12px] text-slate-400">🔇</span> : null}
        </div>
        <div className="truncate text-[13px] text-slate-600">{subtitle}</div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {time ? <div className="text-[12px] text-slate-400">{time}</div> : null}
        {badgeText ? (
          <div className="rounded-full bg-orange-500 px-2 py-0.5 text-[12px] font-semibold text-white">
            @{badgeText}
          </div>
        ) : null}
      </div>
    </button>
  );
}
