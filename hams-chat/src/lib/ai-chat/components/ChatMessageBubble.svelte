<script lang="ts">
  import type { ChatMessage } from "../types";
  import { chatUI } from "../stores/chatUI";
  import { chatEngine } from "../stores/chatEngine";

  export let msg: ChatMessage;

  $: isMe = msg.role === "me";
  $: quickReplies = msg.meta?.quickReplies ?? null;

  $: selectedRoomId = $chatUI.selectedRoomId ?? null;
  $: awaiting = selectedRoomId ? chatEngine.getRoom(selectedRoomId).awaiting : null;

  const canPick = Boolean(awaiting && selectedRoomId);

  function pick(value: string, display = "") {
    if (!selectedRoomId) return;
    chatEngine.pickQuickReply(selectedRoomId, value, display);
  }
</script>

<div class={"flex items-end gap-2 " + (isMe ? "justify-end" : "justify-start")}>
  {#if !isMe}
    <div class="h-9 w-9 shrink-0 rounded-2xl bg-white/60 shadow-sm ring-1 ring-black/5" />
  {/if}

  <div class={"max-w-[78%] " + (isMe ? "items-end" : "items-start") + " flex flex-col"}>
    {#if !isMe}
      <div class="mb-0.5 px-1 text-[12px] font-medium text-slate-900/80">
        {msg.role === "other-ai" ? "AI" : "홍길동"}
      </div>
    {/if}

    <div class="flex items-end gap-2">
      {#if !isMe}
        <span class="order-2 text-[11px] text-slate-700/60">{msg.time}</span>
      {/if}

      <div
        class={[
          "whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ring-1 ring-black/5",
          isMe ? "bg-[#ffe75a] text-slate-900" : "bg-white/95 text-slate-900",
        ].join(" ")}
      >
        {msg.text}
      </div>

      {#if isMe}
        <span class="text-[11px] text-slate-700/60">{msg.time}</span>
      {/if}
    </div>

    {#if !isMe && quickReplies?.length}
      <div class="mt-2 flex flex-wrap gap-2">
        {#each quickReplies as r, idx (r.value + "-" + idx)}
          <button
            type="button"
            disabled={!canPick}
            on:click={() => pick(r.value, r.display ?? "")}
            class={[
              "rounded-full bg-white/90 px-3 py-1.5 text-[12px] shadow-sm ring-1 ring-black/5 transition",
              canPick ? "hover:bg-white" : "opacity-50 cursor-not-allowed",
            ].join(" ")}
          >
            {r.display ?? r.value}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
