/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/mcp/probe.ts
export const runtime = 'nodejs';

import { spawn } from 'node:child_process';
// import type { Prisma } from '@prisma/client';
import WebSocket from 'ws';
import { McpRow, StatusInfo, StdioRow, ToolsResult } from './mcp';
import { listToolsFromHttp, listToolsFromStdio, listToolsFromWebSocket } from './toolList';

// ===== Json 타입 가드 =====
// const isJsonObject = (v: Prisma.JsonValue): v is Prisma.JsonObject =>
//   typeof v === 'object' && v !== null && !Array.isArray(v);

// const isObjectArray = (v: Prisma.JsonValue): v is Prisma.JsonObject[] =>
//   Array.isArray(v) && v.every(isJsonObject);
const isJsonObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isObjectArray = (v: unknown): v is Record<string, unknown>[] =>
  Array.isArray(v) && v.every(isJsonObject);

// ===== 프로브 구현 =====
async function probeWebSocket(url?: string, timeoutMs = 3000): Promise<StatusInfo> {
  if (!url) return { status: 'error', statusMessage: 'websocket url이 없습니다.' };
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const t = setTimeout(() => {
        try { ws.terminate(); } catch {}
        resolve({ status: 'error', statusMessage: 'websocket timeout' });
      }, timeoutMs);

      ws.once('open', () => {
        clearTimeout(t);
        try { ws.close(); } catch {}
        resolve({ status: 'ok', statusMessage: 'websocket connected' });
      });
      ws.once('error', (err) => {
        clearTimeout(t);
        resolve({ status: 'error', statusMessage: `websocket error: ${String(err)}` });
      });
    } catch (e: any) {
      resolve({ status: 'error', statusMessage: `websocket exception: ${e?.message ?? String(e)}` });
    }
  });
}

async function probeHttp(baseUrl?: string, timeoutMs = 3000): Promise<StatusInfo> {
  if (!baseUrl) return { status: 'error', statusMessage: 'http baseUrl이 없습니다.' };

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
  try {
    // HEAD 먼저, 안 되면 GET
    let res = await fetch(baseUrl, { method: 'HEAD', signal: ctrl.signal });
    if (!res.ok) {
      res = await fetch(baseUrl, { method: 'GET', signal: ctrl.signal });
    }
    clearTimeout(to);
    if (res.ok) return { status: 'ok', statusMessage: `http ok: ${res.status}` };
    return { status: 'error', statusMessage: `http status: ${res.status}` };
  } catch (e: any) {
    clearTimeout(to);
    const msg = e?.name === 'AbortError' ? 'http timeout' : `http error: ${e?.message ?? String(e)}`;
    return { status: 'error', statusMessage: msg };
  }
}

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

function normalizeRow(row: McpRow): McpRow {
  if (row.type !== 'stdio') return row;
  const std = row as StdioRow;

  // cmdArgs 파싱
  const args = std.cmdArgs ? parseArgs(std.cmdArgs).filter(Boolean) : [];

  // env: cmdEnv/문자열 파싱
  const env = std.cmdEnv ? parseArgs(std.cmdEnv).filter(Boolean) : [];

  return {
    ...std,
    args,
    env,
  };
}

/** env 입력(배열/문자열/객체)을 스폰용 env 객체로 변환 */
function toEnvObject(src?: string[] | string | Record<string, string>): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = { ...process.env };
  if (!src) return base;

  // 객체면 그대로 병합
  if (typeof src === 'object' && !Array.isArray(src)) {
    Object.assign(base, src);
    return base;
  }

  const tokens = Array.isArray(src) ? src : parseArgs(src);

  for (const token of tokens) {
    // KEY=VALUE 우선
    let [k, ...rest] = token.split('=');
    if (rest.length === 0) {
      // 없으면 KEY:VALUE도 허용
      [k, ...rest] = token.split(':');
    }
    if (rest.length > 0) {
      const key = k.trim();
      const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key) base[key] = val;
    }
    // 그 외(단순 값 "1" 같은 것)는 env로는 무의미하므로 무시
  }
  return base;
}

async function probeStdio(row: StdioRow, timeoutMs = 3000): Promise<StatusInfo> {
  return new Promise<StatusInfo>((resolve) => {   // 제네릭 지정
    // 1) args 정규화: 배열이 있으면 우선 사용, 없으면 cmdArgs 문자열 파싱
    const args = (row.args && row.args.length ? row.args : parseArgs(row.cmdArgs)).filter(Boolean);
  
    // 2) env 정규화: env/ cmdEnv 를 객체로 변환(=, : 형식 지원)
    const envObj = toEnvObject(row.cmdEnv ?? row.env);

    // const child = spawn(row.cmd, row.args ?? [], { stdio: ['ignore','pipe','pipe'], env: { ...process.env }, windowsHide: process.platform==='win32' });
    const isWin = process.platform === 'win32';
    const child = spawn(row.cmd, args, {
      stdio: ['ignore','pipe','pipe'],
      env: { ...process.env, ...envObj },
      windowsHide: isWin,                   // 비윈도우에선 무시됨
      shell: false,                         // 윈도우: shell: true → 내부적으로 cmd.exe 사용, 맥/리눅스: shell: true → 내부적으로 /bin/sh 사용
    });

    let done = false;
    const t = setTimeout(() => {
      if (done) return; done = true;
      try { child.kill('SIGTERM'); } catch {}
      resolve({ status: 'error', statusMessage: `timeout without response (${timeoutMs}ms)` });
    }, timeoutMs);

    child.once('error', (err) => {
      if (done) return; done = true; clearTimeout(t);
      resolve({ status: 'error', statusMessage: `spawn error: ${String(err)}` });
    });
    child.once('exit', (code, signal) => {
      if (done) return; done = true; clearTimeout(t);
      resolve(code === 0
        ? { status: 'ok', statusMessage: 'exit 0' }
        : { status: 'error', statusMessage: `exit ${code ?? ''} ${signal ?? ''}` });
    });
  });
}

async function probeOne(row: McpRow): Promise<StatusInfo> {
  switch (row.type) {
    case 'websocket':
      return probeWebSocket(row.url);
    case 'http':
      return probeHttp(row.baseUrl);
    case 'stdio':
      // 이 블록 안에서 row는 StdioRow 로 좁혀짐
      return probeStdio(row);
    default:
      // 실제로는 도달 불가지만, 타입 만족을 위해 안전망
      return { status: 'error', statusMessage: 'unknown type' };
  }
}

async function listToolsForRow(row: McpRow): Promise<ToolsResult> {
  switch (row.type) {
    case 'stdio':     return await listToolsFromStdio(row);
    case 'websocket': return await listToolsFromWebSocket(row);
    case 'http':      return await listToolsFromHttp(row);
  }
}

// ===== 핵심: mcp_data에 status/mesage를 "로우별"로 주입 =====
export async function connectAndAnnotateMcpData(
  // mcpData: Prisma.JsonValue,
// ): Promise<Prisma.JsonValue> {
  mcpData: any,
): Promise<any> {
  // 객체 배열이면 각 요소마다 개별 프로브
  if (isObjectArray(mcpData)) {
    const rows = mcpData as unknown as McpRow[];
    const rowsWithStatusAndTools = await Promise.all(
      rows.map(async (row) => {
        const norm = normalizeRow(row);
        // console.log ("norm ==============>", norm)
        const statusInfo = await probeOne(norm); // 상태 체크는 정규화본으로

        return {
          // ...(norm as Record<string, Prisma.JsonValue>),
          ...(norm as Record<string, any>),
          status: statusInfo.status,
          statusMessage: statusInfo.statusMessage,
        };
      })
    );

    // return rowsWithStatusAndTools as unknown as Prisma.JsonValue;
    return rowsWithStatusAndTools as unknown as any;
  }

  // 단일 객체면 그 객체 하나만 프로브
  if (isJsonObject(mcpData)) {
    const row = mcpData as unknown as McpRow;
    const norm = normalizeRow(row);
    const [statusInfo, tools] = await Promise.all([
      probeOne(norm),
      listToolsForRow(norm),
    ]);

    // return {
    //   ...(row as Record<string, Prisma.JsonValue>),
    //   status: statusInfo.status,
    //   statusMessage: statusInfo.statusMessage,
    //   tools,
    // } as unknown as Prisma.JsonValue;
    
    return {
      ...(row as Record<string, any>),
      status: statusInfo.status,
      statusMessage: statusInfo.statusMessage,
      tools,
    } as any;
  }

  // 원시/기타면 래핑
  const res = await probeOne({ type: 'stdio', cmd: 'node', args: ['-v'] });
  // return {
  //   value: mcpData,
  //   status: res.status,
  //   statusMessage: res.statusMessage,
  // } as Prisma.JsonObject;
  return {
    value: mcpData,
    status: res.status,
    statusMessage: res.statusMessage,
  } as any;
}
