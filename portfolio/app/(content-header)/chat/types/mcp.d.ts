/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(content-header)/chat/types/mcp.d.ts

/** JSON Schema(필요한 부분만 경량화) */
export type JsonSchema =
  | { type: 'string'; enum?: string[]; description?: string; pattern?: string }
  | { type: 'number' | 'integer'; minimum?: number; maximum?: number; description?: string }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; items: JsonSchema; minItems?: number; maxItems?: number; description?: string }
  | {
      type: 'object';
      properties: Record<string, JsonSchema>;
      required?: string[];
      additionalProperties?: boolean;
      description?: string;
    };

/** MCP Tool Spec (백엔드 toolSpec.ts와 동일 구조) */
export type McpToolSpec = {
  name: string;                        // 고유 이름
  description: string;                 // 설명
  input_schema: JsonSchema;            // 입력 파라미터 스키마(루트는 object 권장)
  safe?: boolean;                      // 안전 툴 여부(선택)
  auth?: 'auto' | 'user' | 'none';     // 인증 정책(자동, 사용자, 사용안함)
  version?: string;                    // 스펙 버전(선택)
};

/** OpenAI 함수콜 호환용 툴 디스크립터 */
export type McpToolFunctionDescriptor = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: JsonSchema; // = input_schema
  };
};

/** MCP 서버 RPC 기본 타입들 */
export type McpMethod = 'initialize' | 'tools/list' | 'tools/call';

export type McpRequest<TParams = any> = {
  id: number;
  method: McpMethod;
  params?: TParams;
};

export type McpError = { code: number; message: string; data?: any };

export type McpResponse<TResult = any> = {
  id?: number;
  result?: TResult;
  error?: McpError;
};

/** 메서드별 payload 타입 */
export type McpInitializeResult = { protocol: string; version: string };

export type McpListToolsResult = { tools: McpToolSpec[] };

export type McpCallParams = {
  name: string;
  arguments: any;   // JSON 객체
  userId?: string;  // 필요 시 사용자 식별
};

export type McpCallResult = any;

/** 에이전트 루프에서 쓰는 메시지/툴콜 타입 */
export type AgentRole = 'system' | 'user' | 'assistant' | 'tool';

export type AgentMessage = {
  role: AgentRole;
  content: string | null;
  name?: string;            // tool 메시지일 때 툴 이름
  tool_call_id?: string;    // OpenAI 스타일 tool call id
};

export type ToolCall = {
  id: string;
  type: 'function';
  name: string;
  arguments: string; // stringified JSON
};

/** MCP 클라이언트 옵션 */
export type McpClientOptions = {
  url: string;      // ws://localhost:8080 등
  timeoutMs?: number;
};

export type McpStatus = 'ok' | 'error' | 'warn' | 'wait';
export type McpType = 'websocket' | 'stdio' | 'http' | null;

// mcp config
export type McpConfig = {
  id: string;
  name: string;
  type: McpType;        // 추가
  url?: string;         // websocket 전용
  baseUrl?: string;     // http 전용
  cmd?: string;         // stdio 전용
  args?: string;        // stdio 전용
  env?: string;         // stdio 전용
  cmdArgs?: string;     // stdio 전용
  cmdEnv?: string;      // stdio 전용
  description?: string;
  createdAt?: number;

  tools?: McpToolSpec[];

  status?: McpStatus;
  statusMessage?: string;
};

export type Mcp = {
  id: string;
  user_id: string;
  mcp_data: McpConfig[];
  use_yn: boolean;
};