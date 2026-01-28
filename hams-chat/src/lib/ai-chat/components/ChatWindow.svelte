<!-- src/lib/ai-chat/components/ChatWindow.svelte -->

<script lang="ts">
  import { onMount, tick } from "svelte";
  import ChatHeader from "./ChatHeader.svelte";
  import ChatMessageList from "./ChatMessageList.svelte";
  import ChatComposer from "./ChatComposer.svelte";
  import { chatUI } from "../stores/chatUI";
  import { chatMessages } from "../stores/chatMessages";
  import type { ComposerMenuKey } from "../types";

  const title = "홍길동";
  const subtitle = "2";

  const headerActions = [
    { key: "search", label: "검색" },
    { key: "call", label: "통화" },
    { key: "video", label: "영상" },
    { key: "menu", label: "메뉴" },
  ];

  let chatbotEnabled = false;
  let listWrapEl: HTMLDivElement | null = null;

  $: selectedRoomId = $chatUI.selectedRoomId ?? "r3";
  $: messages = ($chatMessages.rooms[selectedRoomId]?.messages ?? []);

  onMount(() => {
    chatMessages.ensureRoom(selectedRoomId);

    try {
      const storageItem = localStorage.getItem("chatbotEnabled");
      if (storageItem !== null) chatbotEnabled = storageItem === "1";
    } catch {}
  });

  // 방 바뀌면 ensure
  $: chatMessages.ensureRoom(selectedRoomId);

  // 새 메시지 추가 시 아래로
  $: if (messages) scrollToBottom(messages.length);

  async function scrollToBottom(_len: number) {
    await tick();
    if (!listWrapEl) return;
    listWrapEl.scrollTop = listWrapEl.scrollHeight;
  }

  // localStorage 동기화
  $: {
    try {
      localStorage.setItem("chatbotEnabled", chatbotEnabled ? "1" : "0");
    } catch {}
  }

  function onSend(text: string) {
    chatMessages.sendText(selectedRoomId, text);
  }

  function onMenuSelect(key: ComposerMenuKey) {
    if (key === "chatbot") {
      chatMessages.pushSystem(selectedRoomId, "🤖 chatbot 메뉴를 선택했어요. 이제부터 AI도 같이 대화를 합니다");
    }
  }

  function onToggleChatbot(next: boolean) {
    chatbotEnabled = next;
    chatMessages.pushSystem(selectedRoomId, next ? "🤖 chatbot 실행됨" : "🛑 chatbot 종료됨");
  }
</script>

<div class="flex h-full flex-col overflow-hidden bg-[#c7d7e6]">
  <ChatHeader {title} {subtitle} actions={headerActions} />

  <div class="flex-1 min-h-0 flex flex-col">
    <div bind:this={listWrapEl} class="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
      <ChatMessageList {messages} />
    </div>

    <div class="bg-white/80 backdrop-blur-sm">
      <ChatComposer {chatbotEnabled} {onSend} {onMenuSelect} {onToggleChatbot} />
    </div>
  </div>
</div>
