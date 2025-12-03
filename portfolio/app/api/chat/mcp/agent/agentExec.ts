import OpenAI from "openai";
import { createMcpStdioClient } from "./agentProc";
import { getMcpRowsFromUser, withTimeout } from "./agentUtil";
import { openaiStreamChat } from "@/app/api/chat/stream";

type FnCall = { id?: string; name: string; argsJson: string };

function extractFunctionCalls(msg: any): FnCall[] {
  const out: FnCall[] = [];

  // A) 최신 포맷: message.tool_calls[]
  if (Array.isArray(msg?.tool_calls)) {
    for (const tc of msg.tool_calls) {
      if ((tc?.type ?? 'function') !== 'function') continue;       // 다른 타입 무시
      const fnName = tc?.function?.name;
      const fnArgs = tc?.function?.arguments;
      if (typeof fnName === 'string') {
        out.push({ id: tc?.id ? String(tc.id) : undefined, name: fnName, argsJson: typeof fnArgs === 'string' ? fnArgs : '{}' });
      }
    }
  }

  // B) 구형 포맷: message.function_call (단일)
  if (!out.length && msg?.function_call?.name) {
    const fc = msg.function_call;
    out.push({ id: undefined, name: fc.name, argsJson: typeof fc.arguments === 'string' ? fc.arguments : '{}' });
  }

  return out;
}

function safeJsonParse<T = any>(s: string | undefined, fallback: T): T {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type McpRow = {
  id: string; type: 'stdio'|'ws'; cmd: string; args?: string[]; cmdArgs?: string;
  env?: Record<string,string>|string[]; cmdEnv?: string; url?: string;
};
type McpClient = {
  listTools(): Promise<{ id:string; name:string; description?:string; inputSchema?:any }[]>;
  callTool(nameOrId: string, args: any): Promise<any>;
  close(): void;
};

const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40);
const makeNs = (mcpId: string, idx: number) => `m${idx}_${sanitize(mcpId).slice(0,10)}`;
const splitNs = (fnName: string) => {
  const m = fnName.match(/^([^_]+_[^_]+)__(.+)$/); // ns__tool
  return m ? { ns: m[1], tool: m[2] } : null;
};

// 네가 이미 만든/앞서 쓴 버전 재사용 가능
async function getMcpRows(userId: string, mcpIds: string[]): Promise<McpRow[]> {
  // const userId: string = "515abe98-c1ea-4f95-ba36-bab7d7507df8";
  // console.log("userId===============>", userId);
  const rows = await getMcpRowsFromUser({ userId: userId });
  return rows as unknown as McpRow[];
}
function createClient(row: McpRow): McpClient {
  // stdio/WS에 맞는 클라이언트를 생성 (앞서 준 예시 유틸 재사용)
  return createMcpStdioClient(row);
}

type OAFunctionTool = {
  type: 'function',
  function: { name: string; description?: string; parameters?: any }
};

export async function runAgentWithMcps(opts: {
  allMessages: any[];
  model: string;
  mcpIds: string[];
  userId: string;
}) {
  // 1) MCP rows 로드
  const rows = await getMcpRows(opts.userId, opts.mcpIds);
  if (!rows.length) return await openaiStreamChat(opts.allMessages, opts.model);
  // console.log("agent exec ==============================> 1.", rows.length)
  // 2) 클라이언트 생성 + tools 병렬 로드 (고장난 MCP는 건너뜀)
  const clients: { ns: string; row: McpRow; client: McpClient }[] = [];
  const registry = new Map<string, { ns: string; mcpId: string; client: McpClient; toolName: string }>();
  const oaTools: OAFunctionTool[] = [];

  await Promise.all(rows.map(async (row, idx) => {
    try {
      // console.log("agent exec ==============================> 2.")
      const client = createClient(row);
      // console.log("agent exec ==============================> 3. client : ", client)
      const ns = makeNs(row.id, idx);
      // console.log("agent exec ==============================> 4. ns : ", ns)
      // const tools = await client.listTools();
      const tools = await withTimeout(client.listTools(), 3000, `listTools ${ns}`);
      // console.log("agent exec ==============================> 5. tools : ", tools)
      // MCP tool → OA tool
      for (const t of tools) {
      // console.log("agent exec ==============================> 6. tool : ", t)
        const oaName = `${ns}__${sanitize(t.name || t.id)}`;
      // console.log("agent exec ==============================> 6. tool oaName : ", oaName)
        oaTools.push({
          type: 'function',
          function: { name: oaName, description: t.description ?? '', parameters: t.inputSchema ?? { type:'object', properties:{} } }
        });
      // console.log("agent exec ==============================> 6. tool oaTools : ", oaTools)
        registry.set(oaName, { ns, mcpId: row.id, client, toolName: t.name || t.id });
      }
      // console.log("agent exec ==============================> 6. tool clients before : ", clients)
      clients.push({ ns, row, client });
      // console.log("agent exec ==============================> 6. tool clients after: ", clients)
    } catch (e) {
      // 이 MCP는 스킵 (로그만)
      console.warn(`[mcp-skip] ${row.id}:`, e);
    }
  }));

  // console.log("agent exec oaTools==============================> 7. ", oaTools)
  if (!oaTools.length) {
    // console.log("oaTools.length====> ", oaTools.length);
    // 툴이 하나도 없으면 그냥 일반 스트림
    try { clients.forEach(c => c.client.close()); } catch {}
    return await openaiStreamChat(opts.allMessages, opts.model);
  }

  // console.log("agent exec messages==============================> 8. ", opts.allMessages)
  // 3) 플래닝 루프 (툴콜 있으면 실행 후 메시지 누적, 없으면 최종 답변 스트림)
  const messages = [...opts.allMessages];
  // console.log("agent exec messages==============================> 9. ", messages)

  for (let step=0; step<6; step++) {
    // console.log("agentExec for =======> ", step);
    const planning = await openai.chat.completions.create({
      model: opts.model,
      messages,
      tools: oaTools,
      tool_choice: 'auto',
      temperature: 0,
      stream: false,
    });

    const msg = planning.choices[0]?.message;
    if (!msg) break;

    if (!msg.tool_calls?.length) {
    // console.log("agentExec for msg.tool_calls =======> ", msg.tool_calls);
      // 최종 답변만 스트리밍
      try { clients.forEach(c => c.client.close()); } catch {}
      const finalMessages = [...messages, msg];
      return await openaiStreamChat(finalMessages, opts.model);
    }

    const safeToolCalls = (msg.tool_calls ?? []).filter(
      (tc: any) => (tc?.type ?? 'function') === 'function' && tc?.function?.name
    );
    // console.log("agentExec for safeToolCalls =======> ", safeToolCalls);

    // assistant tool_calls 메시지 누적
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: safeToolCalls } as any);

    // 안전 정규화 후 라우팅/실행
    const calls = extractFunctionCalls(msg);
    // console.log("agentExec for extractFunctionCalls =======> ", calls);

    // 4) 각 tool_call 라우팅/실행 → tool 메시지 추가
    for (const call of calls) {
      const meta = registry.get(call.name);
      if (!meta) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `ToolNotFound: ${call.name}`,
        } as any);
        continue;
      }
    // console.log("agentExec for tool_call 라우팅/실행 → tool 메시지 추가 =======> ", messages);

      const args = safeJsonParse(call.argsJson, {});
    // console.log("agentExec for args =======> ", args);

      try {
        const res = await meta.client.callTool(meta.toolName, args);
        const text =
          typeof res === 'string'
            ? res
            : ('content' in (res ?? {}) ? JSON.stringify(res.content) : JSON.stringify(res));
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: text,
        } as any);
      } catch (e: any) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `ToolError: ${String(e?.message || e)}`,
        } as any);
      }
    }
    // 다음 루프에서 messages를 입력으로 다시 사용
  }
    // console.log("agentExec end =======> ", opts.allMessages);

  // 5) 스텝 초과 시 폴백
  try { clients.forEach(c => c.client.close()); } catch {}
  return await openaiStreamChat(opts.allMessages, opts.model);
}
