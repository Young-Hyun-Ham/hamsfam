
// types/mcp.ts

export type McpStatus = 'ok' | 'wait' | 'error';
export type StatusInfo = { status: McpStatus; statusMessage?: string };

export type StdioRow = {
  id?: string; name?: string;
  type: 'stdio';
  cmd: string; 
  args?: string[]; 
  env?: string[];
  tools?: ToolsResult;
  cmdArgs?: string;
  cmdEnv?: string;
};

export type WsRow = {
  id?: string; name?: string;
  type: 'websocket';
  url: string;              // ws면 url 필수
  tools?: ToolsResult;
};

export type HttpRow = {
  id?: string; name?: string;
  type: 'http';
  baseUrl: string;          // http면 baseUrl 필수
  headers?: Record<string, string>;
  tools?: ToolsResult;
};

export type McpRow = StdioRow | WsRow | HttpRow;

export type ToolDef = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type ToolsResult = ToolDef[];