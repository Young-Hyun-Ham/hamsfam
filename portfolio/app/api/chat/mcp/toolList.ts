// lib/mcp/listTools-stdio.ts
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { makeInit, makeInitialized, makeToolsList } from './jsonrpc';
import type { StdioRow, ToolsResult, ToolDef, WsRow, HttpRow, McpRow } from './mcp';

// --- 공용 파서: 쉼표(,) 기준, 따옴표 보존 ---
function parseArgs(input?: string): string[] {
  if (!input) return [];

  const out: string[] = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"' && !inSingle) {  // " 토글
      inDouble = !inDouble;
      continue;
    }
    if (ch === "'" && !inDouble) {  // ' 토글
      inSingle = !inSingle;
      continue;
    }

    // 따옴표 밖의 쉼표는 구분자
    if (ch === ',' && !inSingle && !inDouble) {
      const token = buf.trim();
      if (token) out.push(token);
      buf = '';
      continue;
    }

    buf += ch;
  }

  // 마지막 토큰 처리
  const last = buf.trim();
  if (last) out.push(last);

  return out;
}

/** env 입력(배열/문자열/객체)을 스폰용 env 객체로 변환 */
function toEnvObject(
  src?: string[] | string | Record<string, string>
): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = { ...process.env };
  if (!src) return base;

  // 이미 객체면 그대로 병합
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    Object.assign(base, src);
    return base;
  }

  const tokens = Array.isArray(src) ? src : parseArgs(src);

  const argIndex = 1; // 자동 키 필요 시 사용

  for (const token of tokens) {
    const hasEq = token.includes('=');
    const hasColon = token.includes(':');

    if (hasEq || hasColon) {
      // KEY=VALUE 또는 KEY:VALUE
      const sep = hasEq ? '=' : ':';
      const [rawKey, ...rest] = token.split(sep);
      const key = rawKey.trim();
      const val = rest.join(sep).trim().replace(/^['"]|['"]$/g, '');
      if (key) base[key] = val;
      continue;
    }
  }

  return base;
}

export async function listToolsFromStdio(
  row: StdioRow,
  timeoutMs = 60_000
): Promise<ToolsResult> {
  // 1) args 정규화: row.args 우선, 없으면 cmdArgs 파싱
  const args = (row.args?.length ? row.args : parseArgs(row.cmdArgs)).filter(Boolean);
  // 2) env 정규화: env / cmdEnv 모두 지원
  const envObj = toEnvObject(row.env ?? row.cmdEnv);
  // 3) 프로세스 실행 (stdin 반드시 pipe)
  const child = spawn(row.cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: envObj,
    windowsHide: process.platform === 'win32',
    shell: false,
  });

  // (옵션) stderr 로깅
  // child.stderr?.setEncoding('utf8');
  // child.stderr?.on('data', d => {
  //   console.error('[mcp-stderr]', String(d));
  // });

  // 4) STDIO 파서: Content-Length 우선 + 줄 JSON 폴백
  let buf = '';
  const msgHandlers: ((msg: any) => void)[] = [];

  const dispatch = (jsonStr: string) => {
    try {
      const msg = JSON.parse(jsonStr);
      msgHandlers.forEach(h => h(msg));
    } catch {
      /* 비-JSON 로그는 무시 */
    }
  };

  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk) => {
    buf += String(chunk);
    while (true) {
      // (A) Content-Length 프레임 처리
      if (/^Content-Length:/i.test(buf)) {
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd === -1) break; // 헤더 아직 덜 옴
        const header = buf.slice(0, headerEnd);
        const m = /Content-Length:\s*(\d+)/i.exec(header);
        const len = m ? Number(m[1]) : NaN;
        const start = headerEnd + 4;
        if (!Number.isFinite(len) || buf.length < start + len) break; // 본문 대기
        const jsonStr = buf.slice(start, start + len);
        buf = buf.slice(start + len);
        dispatch(jsonStr);
        continue; // 다음 메시지 계속 탐색
      }
      // (B) 줄 JSON 폴백
      const nl = buf.indexOf('\n');
      if (nl === -1) break;
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) dispatch(line);
    }
  });

  const waitJson = <T = any>(matchId: number): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      const h = (msg: any) => {
        try {
          if (msg?.id === matchId) {
            clearTimeout(t);
            const i = msgHandlers.indexOf(h);
            if (i >= 0) msgHandlers.splice(i, 1);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result as T);
          }
        } catch { /* ignore */ }
      };
      msgHandlers.push(h);
    });

  // 5) 송신도 Content-Length 프레이밍
  const sendJson = (obj: any) => {
    const s = JSON.stringify(obj);
    const frame = `Content-Length: ${Buffer.byteLength(s, 'utf8')}\r\n\r\n${s}`;
    child.stdin?.write(frame);
  };

  try {
    // 6) initialize → 응답 수신
    sendJson(makeInit(1));
    await waitJson(1);

    // 7) notifications/initialized (알림: id 없음)
    sendJson(makeInitialized());

    // 8) tools/list → 응답 수신
    sendJson(makeToolsList(2));
    const result = await waitJson<{ tools: ToolDef[] }>(2);

    console.log("최종 tools data ========> ", result?.tools);
    // 9) 종료
    try { child.stdin?.end(); } catch {}
    try { child.kill(); } catch {}

    // return { status: 'ok', statusMessage: 'tools listed', tools: result?.tools ?? [] };
    return result?.tools ?? [];
  } catch (e: any) {
    try { child.stdin?.end(); } catch {}
    try { child.kill(); } catch {}
    // return { status: 'error', statusMessage: e?.message ?? String(e) };
    return [];
  }
}

// 주의: MCP 표준 트랜스포트는 stdio/HTTP가 공식이며(WS는 커스텀일 수 있음). :contentReference[oaicite:3]{index=3}
export async function listToolsFromWebSocket(row: WsRow, timeoutMs = 60_000): Promise<ToolsResult> {
  return new Promise<ToolsResult>((resolve) => {
    const ws = new WebSocket(row.url);
    const timer = setTimeout(() => {
      try { ws.terminate(); } catch {}
      // resolve({ status: 'error', statusMessage: 'ws timeout' });
      resolve([]);
    }, timeoutMs);

    const waiters = new Map<number, (res: any) => void>();
    const send = (obj: any) => ws.send(JSON.stringify(obj));

    ws.on('open', () => {
      waiters.set(1, () => {
        send(makeToolsList(2));
      });
      waiters.set(2, (res) => {
        clearTimeout(timer);
        try { ws.close(); } catch {}
        // resolve({ status: 'ok', statusMessage: 'tools listed', tools: (res?.tools ?? []) as ToolDef[] });
        resolve((res?.tools ?? []) as ToolDef[]);
      });
      send(makeInit(1));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        const fn = waiters.get(msg?.id);
        if (msg?.error) {
          clearTimeout(timer);
          try { ws.close(); } catch {}
          // resolve({ status: 'error', statusMessage: msg.error.message });
          resolve([]);
        } else if (fn) {
          fn(msg.result);
        }
      } catch {}
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      // resolve({ status: 'error', statusMessage: `ws error: ${String(err)}` });
      resolve([]);
    });
  });
}

// 공식 문서: MCP는 JSON-RPC를 공통 포맷으로 쓰고, 표준 트랜스포트로 stdio와 스트리머블 HTTP를 정의. :contentReference[oaicite:4]{index=4}
export async function listToolsFromHttp(row: HttpRow, timeoutMs = 60_000): Promise<ToolsResult> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);

  const post = async (payload: any) => {
    const res = await fetch(row.baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(row.headers ?? {}) },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return res.json();
  };

  try {
    await post(makeInit(1));
    const { result } = await post(makeToolsList(2));
    clearTimeout(to);
    // return { status: 'ok', statusMessage: 'tools listed', tools: (result?.tools ?? []) as ToolDef[] };
    return (result?.tools ?? []) as ToolDef[];
  } catch (e: any) {
    clearTimeout(to);
    // return { status: 'error', statusMessage: e?.message ?? String(e) };
    return [];
  }
}

// 
async function listToolsForRow(row: McpRow): Promise<ToolsResult> {
  switch (row.type) {
    case 'stdio':     return listToolsFromStdio(row);
    case 'websocket': return listToolsFromWebSocket(row);
    case 'http':      return listToolsFromHttp(row);
  }
}

// 
export async function annotateMcpDataWithTools(mcpData: unknown): Promise<unknown> {
  if (Array.isArray(mcpData)) {
    const rows = mcpData as McpRow[];
    return Promise.all(rows.map(listToolsForRow)); // tools 결과만
  } else if (mcpData && typeof mcpData === 'object') {
    return listToolsForRow(mcpData as McpRow);     // 단일 결과만

  }
  return [];
}