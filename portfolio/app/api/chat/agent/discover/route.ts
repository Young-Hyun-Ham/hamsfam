// app/api/chat/agent/discover/route.ts
import { NextResponse } from "next/server";
import { buildRegistryFromUser, recommendTools } from "@/lib/mcp/agent/shared";
import { corsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { headers: corsHeaders(req.headers.get("origin") ?? undefined) });
}

export async function POST(req: Request) {
  console.log("post discover==============================================>")
  const origin = req.headers.get("origin") ?? undefined;
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" };

  try {
    const { userId, messages, model, mcpIds } = await req.json();

    const { oaTools, registry, closeAll } = await buildRegistryFromUser(userId, mcpIds);
    // registry는 서버만 알고 있어도 됨(실행 때 다시 만든다면 무상태)
    const recommended = await recommendTools(messages ?? [], oaTools, model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini");
    closeAll(); // 실행은 안 하니 종료

    // 프론트가 렌더하기 쉽게 필요한 정보만 매핑
    const toolsForUi = [...registry.keys()].map(oaName => {
      const r = registry.get(oaName)!;
      return {
        oaName,                  // ns__tool
        mcpId: r.mcpId,
        ns: r.ns,
        name: r.toolName,        // 원래 MCP tool name
        // schema/description은 oaTools에서 다시 맵핑 가능하지만 간단히 생략 or 포함
      };
    });

    return NextResponse.json({ tools: toolsForUi, recommended }, { headers });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers });
  }
}
