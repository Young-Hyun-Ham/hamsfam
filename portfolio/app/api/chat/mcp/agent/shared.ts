// lib/agent/shared.ts
import OpenAI from "openai";
import { getMcpRowsFromUser } from "./agentUtil";
import { createMcpStdioClient } from "./agentProc";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type McpRow = {
  id: string; type: 'stdio'|'ws'; cmd: string; args?: string[]; cmdArgs?: string;
  env?: Record<string,string>|string[]; cmdEnv?: string; url?: string;
};
export type McpClient = {
  listTools(): Promise<{ id:string; name:string; description?:string; inputSchema?:any }[]>;
  callTool(nameOrId: string, args: any): Promise<any>;
  close(): void;
};

export type RegistryItem = {
  ns: string; mcpId: string; client: McpClient; toolName: string;
};

export type OAFunctionTool = {
  type: 'function',
  function: { name: string; description?: string; parameters?: any }
};

export const sanitize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40);

// ✅ “인덱스 기반” 대신 “안정적 네임스페이스” 권장 (UUID 앞 8글자 등)
export const makeNsStable = (mcpId: string) => `m_${sanitize(mcpId).slice(0, 10)}`;

export function withTimeout<T>(p: Promise<T>, ms: number, label = 'timeout'): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

export async function buildRegistryFromUser(userId: string, mcpIds?: string[]) {
  // 1) JSON 컬럼에서 MCP 목록 로드
  const rows = await getMcpRowsFromUser({ userId, mcpIds });
  const clients: RegistryItem[] = [];
  const registry = new Map<string, RegistryItem>();    // oaName → RegistryItem
  const oaTools: OAFunctionTool[] = [];

  for (const row of rows) {
    const ns = makeNsStable(row.id);
    try {
      const client = createMcpStdioClient(row);
      const tools = await withTimeout(client.listTools(), 3000, `listTools ${ns}`);
      if (!Array.isArray(tools) || tools.length === 0) {
        try { client.close(); } catch {}
        continue;
      }
      for (const t of tools) {
        const oaName = `${ns}__${sanitize(t.name || t.id)}`;
        oaTools.push({
          type: 'function',
          function: {
            name: oaName,
            description: t.description ?? '',
            parameters: t.inputSchema ?? { type: 'object', properties: {} }
          }
        });
        registry.set(oaName, { ns, mcpId: row.id, client, toolName: t.name || t.id });
      }
      clients.push({ ns, mcpId: row.id, client, toolName: '' } as any);
    } catch (e) {
      // 스킵
    }
  }

  const closeAll = () => { try { clients.forEach(c => c.client.close()); } catch {} };
  return { oaTools, registry, closeAll };
}

// 모델이 “추천”만 하도록 1차 플래닝(실행 X)
export type FnCall = { id?: string; name: string; argsJson: string };
export function extractFunctionCalls(msg: any): FnCall[] {
  const out: FnCall[] = [];
  if (Array.isArray(msg?.tool_calls)) {
    for (const tc of msg.tool_calls) {
      if ((tc?.type ?? 'function') !== 'function') continue;
      const fnName = tc?.function?.name;
      const fnArgs = tc?.function?.arguments;
      if (typeof fnName === 'string') {
        out.push({ id: tc?.id ? String(tc.id) : undefined, name: fnName, argsJson: typeof fnArgs === 'string' ? fnArgs : '{}' });
      }
    }
  }
  if (!out.length && msg?.function_call?.name) {
    const fc = msg.function_call;
    out.push({ name: fc.name, argsJson: typeof fc.arguments === 'string' ? fc.arguments : '{}' });
  }
  return out;
}

export async function recommendTools(allMessages: any[], oaTools: OAFunctionTool[], model: string) {
  const planning = await openai.chat.completions.create({
    model,
    messages: allMessages,
    tools: oaTools,
    tool_choice: 'auto',
    temperature: 0,
    stream: false,
  });
  const msg = planning.choices[0]?.message;
  if (!msg) return [];
  return extractFunctionCalls(msg).map(c => c.name); // oaName 목록
}
