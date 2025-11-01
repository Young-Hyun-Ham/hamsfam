// src/api/chatClient.ts
import { ChatOptions, ChatRole } from "../types/chat";
import { api } from "@/lib/axios";

/**
 * axios + XHR onDownloadProgress 로 텍스트 스트리밍
 * @param messages  OpenAI 스타일 메시지 배열
 * @param onChunk   조각 수신 시 호출될 콜백
 * @param signal    AbortController.signal
 */
export async function streamChatCompletion(
  messages: { role: ChatRole; content: string }[],
  onChunk: (textChunk: string) => void,
  signal?: AbortSignal,
  options?: ChatOptions
): Promise<void> {
  let lastLen = 0;

  await api.post(
    '/api/chat/stream',
    { messages, options },
    {
      //baseURL: `${CHAT_BASE}`,     // ← per-request로 baseURL override
      responseType: 'text',        // XHR 텍스트 스트림
      signal,
      onDownloadProgress: (pe) => {
        // axios의 XHR 객체에 누적 텍스트가 들어있음
        const xhr = pe.event?.target as XMLHttpRequest | undefined;
        const whole = xhr?.responseText ?? '';
        if (!whole) return;

        // 이번에 새로 들어온 부분만 잘라서 콜백으로 전달
        const next = whole.slice(lastLen);
        lastLen = whole.length;
        if (next) onChunk(next);
      },
    },
  );
}

export async function readToText(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void
) {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) onChunk(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
}