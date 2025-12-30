// app/(content-header)/ai-chat/page.tsx
"use client";

import { useEffect } from "react";
import ChatShell from "./components/ChatShell";
import { useChatEngineStore } from "./store/chatEngineStore";
import sample from "./sample.json";

export default function ChatPage() {
  const setScenario = useChatEngineStore((s) => s.setScenario);
  
  useEffect(() => {
    setScenario(sample.nodes, sample.edges);
  }, [setScenario]);
  
  return (
    <div className="h-[calc(100dvh-64px)] px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3">
      <ChatShell />
    </div>
  );
}
