// app/(content-header)/chatbot/page.tsx
"use client";

import ChatContainer from "./components/ChatContainer";

export default function ChatPage() {
  return (
    <div className="-mx-6 px-[20px] h-[calc(100vh-120px)] min-h-[500px]">
      <ChatContainer />
    </div>
  );
}
