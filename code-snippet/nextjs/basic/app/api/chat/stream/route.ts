// app/api/chat/stream/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { corsHeaders } from "@/lib/cors";
import { pickContent, searchSimilarDocs } from "@/lib/chat/utils";
import { ChatStreamRequest, GDriveSearchOpts, Role } from "@/app/types/types";
import { runAgentWithMcps } from "@/lib/mcp/agent/agentExec";
import { requireUserId } from "@/lib/authServer";
import { ollamaStreamChat, openaiStreamChat } from "@/lib/chat/stream";

// Prisma를 쓰므로 Edge가 아닌 Node 런타임 사용
export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/** CORS 프리플라이트 */
export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { headers: corsHeaders(req.headers.get("origin") ?? undefined) });
}

/**
 * @summary stream chat
 * @description 선택한 모드와, 모델로 스트림 채팅 처리
 * @tag chat
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin") ?? undefined;
  
  const headers = {
    ...corsHeaders(origin),
    "Content-Type": "text/plain; charset=utf-8",
  };

  let body: ChatStreamRequest;
  try {
    body = (await req.json()) as ChatStreamRequest;
  } catch {
    return new NextResponse("Bad Request", { status: 400, headers });
  }

  const messages = body.messages ?? [];
  const options = body.options ?? { mode: 'chat', model: DEFAULT_MODEL };
  const isAgent = options.mode === "agent" || (options.mcpIds?.length || options.mcpId);
  const userId = await requireUserId(req);
  
  // Google Drive 검색 옵션
  const { pageSize, candidateLimit, sharedOnly, driveId } = options;
  const opts: GDriveSearchOpts = {
    pageSize: Math.min(Math.max(Number(pageSize || 5), 1), 20),
    candidateLimit: Math.min(Math.max(Number(candidateLimit || 20), 5), 100),
    sharedOnly: sharedOnly ?? false,
    driveId: driveId || undefined,
  };

  try {
    // 1) 유저/시스템 메시지 저장 (여러 개면 트랜잭션)
    if (messages?.length) {
      await prisma.$transaction(
        messages.map((m) =>
          prisma.conversations.create({
            data: { role: m.role, content: m.content },
          })
        )
      );
    }

    // 2) 최근 user 질문
    const userQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // 3) RAG 검색
    const docs = await searchSimilarDocs(userQuestion, opts);
    const contextText =
      (docs && docs.length ? docs.map(pickContent).join("\n\n") : "") || "No relevant context found.";

    // 4) 시스템 프롬프트 + 원본 메시지
    const ragPrompt =
      "You are a helpful assistant. Use the following context to answer the question.\n\n" +
      `Context:\n${contextText}\n\n`;
      // + "Answer in Korean if the question is in Korean.";

    const allMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: ragPrompt },
      ...messages.map((m) => ({ role: m.role as Role, content: m.content })),
    ];

    // console.log("model =========================> ", options.model);
    if (isAgent) {
      const mcpIds = (options.mcpIds?.length ? options.mcpIds : [options.mcpId]).filter(Boolean) as string[];
      const clientStream = await runAgentWithMcps({
        allMessages: messages,
        model: options.model ?? DEFAULT_MODEL,
        mcpIds,
        userId,
      });
      // console.log("agent ==========================>", clientStream);
      return new Response(clientStream, { status: 200, headers });

    } else {
      // 5) model이 llama 이면 Ollama 아니면 OpenAI 중 하나의 스트리밍을 시작하고, 스트림을 후킹해서 assistantReply 누적
      const clientStream = options.model?.includes("llama") ?
        await ollamaStreamChat(allMessages, options.model) :
        await openaiStreamChat(allMessages, options.model) ;

      // console.log("chat ==========================>", clientStream);
      // 클라이언트로 그대로 흘려보내기
      return new Response(clientStream, {
        status: 200,
        headers,
      });

    }
  } catch (e) {
    console.error("STREAM ERROR:", e);
    const errText = "\n\n[stream-error] backend exception occurred. See server logs.";
    return new Response(errText, { status: 500, headers });
  }
}
