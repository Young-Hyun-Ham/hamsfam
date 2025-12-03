/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/mcp/jsonrpc.ts
type JsonRpcReq = { jsonrpc: '2.0'; id: number; method: string; params?: any };
type JsonRpcRes<R = any> = { jsonrpc: '2.0'; id: number; result?: R; error?: { code: number; message: string; data?: any } };

export const makeInitialized = () => ({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
});

export function makeInit(id: number): JsonRpcReq {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',        // 최신 스펙 버전
      capabilities: { tools: { listChanged: true } },
      clientInfo: { name: 'clt-nextjs', version: '1.0.0' },
    },
  };
}

export function makeToolsList(id: number): JsonRpcReq {
  return { jsonrpc: '2.0', id, method: 'tools/list', params: {} };
}
// spec: 클라이언트는 tools/list 로 툴을 조회함. :contentReference[oaicite:2]{index=2}
