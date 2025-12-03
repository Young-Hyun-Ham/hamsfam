
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { streamOpenAIChat } from "@/app/api/chat/utils";
// import { prisma } from "@/lib/db";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

// open ai를 활용한 Stream Chat
export async function openaiStreamChat (
  allMessages: ChatCompletionMessageParam[],
  model: string | undefined,
) {
  // console.log("Open AI stream service start =>");
  const baseStream = streamOpenAIChat(allMessages, model ?? DEFAULT_MODEL);

  // 누적을 위해 탭(tee)으로 갈라 한 줄은 accumulate, 한 줄은 클라이언트로 전송
  const [accStream, clientStream] = baseStream.tee();
  let assistantReply = "";
  
  // 누적 소비(백그라운드): accStream을 읽으며 문자열 합치기
  (async () => {
    const decoder = new TextDecoder();
    const reader = accStream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantReply += decoder.decode(value, { stream: true });
      }
      // 6) assistant 저장
      if (assistantReply.trim()) {
        // await prisma.conversations.create({
        //   data: { role: "assistant", content: assistantReply },
        // });
      }
    } catch (e) {
      console.error("[accumulate error]", e);
    } finally {
      reader.releaseLock();
    }
  })();
  return clientStream;
}

// ollama를 활용한 Stream Chat
export async function ollamaStreamChat(
  allMessages: ChatCompletionMessageParam[],
  model: string | undefined,
) {
  console.log("Ollama stream service start =>");
  const upstream = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? "llama3.2:1b",
      stream: true,
      messages: allMessages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      // options: { temperature: 0.7, num_ctx: 8192 } // 필요 시 전달
    }),
  });
  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => "");
    throw new Error(`[ollama-upstream-error] ${txt}`);
  }

  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body!.getReader();
  
  let assistant = '';
  let pending = '';

  (async () => {
    try{
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        pending += dec.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let obj: any;
          try { obj = JSON.parse(line); } catch { continue; }

          const piece = obj?.message?.content ?? '';
          if (piece) {
            assistant += piece;
            await writer.write(enc.encode(piece));
          }
        }
      }
    } catch (e) {
      console.error("[accumulate error]", e);
    } finally {
      await writer.close(); // 스트림 종료(EOF)
      if (assistant.trim()) {
        // await prisma.conversations.create({ data: { role: 'assistant', content: assistant } });
      }
    }
  })();

  // 응답은 "읽기 파이프"를 먼저 건네주고,
  // 위 비동기 루프가 쓰는 대로 클라에 전달됩니다.
  return readable;
}