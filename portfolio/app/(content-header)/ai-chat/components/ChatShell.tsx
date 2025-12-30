// app/(content-header)/ai-chat/components/ChatShell.tsx
"use client";

import { useChatUIStore } from "../store";
import LeftRail from "./LeftRail";
import ListPanel from "./ListPanel";
import ChatWindow from "./ChatWindow";

export default function ChatShell() {
  const leftCollapsed = useChatUIStore((s) => s.leftCollapsed);

  return (
    <div className="mx-auto h-full max-w-6xl">
      <div className="flex h-full overflow-hidden rounded-3xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
        {/* Left: rail + list */}
        <div className="flex h-full shrink-0">
          <LeftRail />

          {!leftCollapsed ? (
            <div className="w-[320px] border-r border-black/5 bg-white">
              <ListPanel />
            </div>
          ) : null}
        </div>

        {/* Right: chat window */}
        <div className="min-w-0 flex-1 bg-[#c7d7e6]">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
