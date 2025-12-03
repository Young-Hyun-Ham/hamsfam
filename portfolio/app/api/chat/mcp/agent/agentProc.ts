import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";

type McpRow = {
  id: string;
  type: 'stdio' | 'ws';
  cmd: string;
  args?: string[];
  cmdArgs?: string;      // 공백 파싱해서 args 대체 가능
  env?: Record<string,string> | string[];  // 이미 갖고있는 형식에 맞추어 변환
  cmdEnv?: string;
  url?: string;          // ws://... 일 때
};

type McpTool = {
  id: string;
  name: string;
  description?: string;
  inputSchema?: any; // JSON Schema
};

type McpClient = {
  listTools(): Promise<McpTool[]>;
  callTool(nameOrId: string, args: any): Promise<any>;
  close(): void;
};

function toEnvObject(input?: any): Record<string,string> {
  // 네 코드의 toEnvObject와 동일하게 처리
  if (!input) return {};
  if (Array.isArray(input)) {
    // ["A=B", "C:D"] 같은 케이스
    const out: Record<string,string> = {};
    for (const line of input) {
      const m = String(line).match(/^([^=:]+)\s*[:=]\s*(.*)$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  }
  if (typeof input === 'string') {
    const out: Record<string,string> = {};
    input.split(/\r?\n/).forEach(line => {
      const m = line.match(/^([^=:]+)\s*[:=]\s*(.*)$/);
      if (m) out[m[1]] = m[2];
    });
    return out;
  }
  return input as Record<string,string>;
}

function parseArgs(s?: string): string[] {
  if (!s) return [];
  // 아주 단순한 공백 분리 (필요하면 yargs-parser로 교체)
  return s.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(v => v.replace(/^"|"$/g, '')) ?? [];
}

/** JSON-RPC 2.0 framing: MCP stdio는 Content-Length 헤더 + \r\n\r\n + 바디 */
function encodeRpc(obj: any): Buffer {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
  return Buffer.concat([header, body]);
}

export function createMcpStdioClient(row: McpRow): McpClient {
  const args = (row.args?.length ? row.args : parseArgs(row.cmdArgs)).filter(Boolean);
  const envObj = { ...process.env, ...toEnvObject(row.cmdEnv ?? row.env) };

  const child: ChildProcessWithoutNullStreams = spawn(row.cmd, args, {
    stdio: ['pipe','pipe','pipe'],
    env: envObj,
    windowsHide: process.platform === 'win32',
    shell: false,
  });

  let buffer = '';
  const pending = new Map<string, (v:any)=>void>();
  const pendingErr = new Map<string, (e:any)=>void>();

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    while (true) {
      const m = buffer.match(/^Content-Length:\s*(\d+)\s*\r?\n\r?\n/);
      if (!m) break;
      const len = Number(m[1]);
      const headerLen = m[0].length;
      if (buffer.length < headerLen + len) break;
      const body = buffer.slice(headerLen, headerLen + len);
      buffer = buffer.slice(headerLen + len);
      try {
        const msg = JSON.parse(body);
        if (msg.id && pending.has(String(msg.id))) {
          pending.get(String(msg.id))!(msg);
          pending.delete(String(msg.id));
          pendingErr.delete(String(msg.id));
        }
      } catch {}
    }
  });

  child.stderr.on('data', (d) => {
    // 필요하면 로깅
  });

  function sendRpc(method: string, params?: any): Promise<any> {
    const id = crypto.randomUUID();
    const req = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      pending.set(String(id), (resp) => {
        if ('error' in resp) reject(resp.error);
        else resolve(resp.result ?? resp);
      });
      pendingErr.set(String(id), reject);
      child.stdin.write(encodeRpc(req));
    });
  }

  return {
    async listTools(): Promise<McpTool[]> {
      const res = await sendRpc('tools/list');
      // 기대 형태: { tools: [...] }
      return res?.tools ?? [];
    },
    async callTool(nameOrId: string, args: any): Promise<any> {
      // 네 서버 규격에 맞춰 method/params 키를 조정
      // 흔한 패턴: { name: string, arguments: object } 또는 { tool: id, input: object }
      const res = await sendRpc('tools/call', { name: nameOrId, arguments: args });
      // 기대 형태: { content: string | object }
      return res;
    },
    close() {
      try { child.kill(); } catch {}
    },
  };
}
