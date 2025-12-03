// app/api/chat/agent/execute/route.ts
import { NextResponse } from "next/server";
import { buildRegistryFromUser, withTimeout } from "@/app/api/chat/mcp/agent/shared";
import { openaiStreamChat } from "@/app/api/chat/stream";
import { corsHeaders } from "@/app/api/chat/cors";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { headers: corsHeaders(req.headers.get("origin") ?? undefined) });
}

export async function POST(req: Request) {
  console.log("post execute==============================================>")
  const origin = req.headers.get("origin") ?? undefined;
  const headers = { ...corsHeaders(origin), "Content-Type": "text/plain; charset=utf-8" };

  try {
    const { userId, mcpIds, messages, model, selected } = await req.json() as {
      userId: string;
      mcpIds?: string[];
      model?: string;
      messages: any[];
      selected: { oaName: string; args?: any }[];  // 프론트에서 체크한 툴 + 인자
    };

    const { registry, closeAll } = await buildRegistryFromUser(userId, mcpIds);
    let allMessages: any[] = [...messages];

    // 선택된 툴들을 순차 실행 → tool 메시지 추가
    for (const { oaName, args } of selected ?? []) {
      const meta = registry.get(oaName);
      if (!meta) {
        allMessages.push({ role: 'tool', content: `ToolNotFound: ${oaName}` });
        continue;
      }
      try {
        const res = await withTimeout(meta.client.callTool(meta.toolName, args ?? {}), 8000, `callTool ${oaName}`);
        const text = typeof res === 'string'
          ? res
          : ('content' in (res ?? {}) ? JSON.stringify(res.content) : JSON.stringify(res));
        allMessages.push({ role: 'tool', content: text });
      } catch (e: any) {
        allMessages.push({ role: 'tool', content: `ToolError: ${String(e?.message || e)}` });
      }
    }

    closeAll();

    // 선택 툴 결과를 컨텍스트로 붙인 뒤, 최종 답변만 스트리밍
    const stream = await openaiStreamChat(allMessages, model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini");
    return new Response(stream, { status: 200, headers });
  } catch (e: any) {
    return new NextResponse(`\n\n[execute-error] ${String(e?.message || e)}`, { status: 500, headers });
  }
}
