// app/(content-header)/ai-chat/components/LeftRail.tsx
"use client";

import { useChatUIStore, type LeftTab } from "../store";

function RailButton({
  active,
  badge,
  onClick,
  children,
}: {
  active?: boolean;
  badge?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative grid h-11 w-11 place-items-center rounded-2xl transition",
        active ? "bg-black/90 text-white shadow-sm" : "text-black/60 hover:bg-black/5",
      ].join(" ")}
    >
      {children}
      {badge ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function LeftRail() {
  const leftTab = useChatUIStore((s) => s.leftTab);
  const leftCollapsed = useChatUIStore((s) => s.leftCollapsed);
  const setLeftTab = useChatUIStore((s) => s.setLeftTab);
  const toggleLeftCollapsed = useChatUIStore((s) => s.toggleLeftCollapsed);

  const clickTab = (t: LeftTab) => {
    setLeftTab(t);
    // 리스트를 접어놓은 상태에서 탭을 누르면 자동 펼치기(카톡 느낌)
    if (leftCollapsed) toggleLeftCollapsed();
  };

  return (
    <div className="flex h-full w-[72px] flex-col items-center justify-between bg-black/[0.03] py-3">
      <div className="flex flex-col items-center gap-2">
        <div className="h-11 w-11 rounded-2xl bg-black/10" />

        <div className="mt-2 flex flex-col gap-2">
          <RailButton active={leftTab === "friends"} onClick={() => clickTab("friends")}>
            <span className="text-lg">👤</span>
          </RailButton>

          <RailButton
            active={leftTab === "chats"}
            badge="1+"
            onClick={() => clickTab("chats")}
          >
            <span className="text-lg">💬</span>
          </RailButton>

          <RailButton active={leftTab === "more"} onClick={() => clickTab("more")}>
            <span className="text-lg">⋯</span>
          </RailButton>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={toggleLeftCollapsed}
          className="grid h-11 w-11 place-items-center rounded-2xl text-black/60 hover:bg-black/5"
          aria-label="목록 접기/펼치기"
          title="목록 접기/펼치기"
        >
          <span className="text-lg">{leftCollapsed ? "⫶" : "⫷"}</span>
        </button>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-2xl text-black/60 hover:bg-black/5"
          aria-label="설정"
        >
          <span className="text-lg">⚙️</span>
        </button>
      </div>
    </div>
  );
}
