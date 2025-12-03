// import { prisma } from "@/lib/db";

// 네가 앞서 쓴 타입과 동일/유사하게 맞춰 사용
type McpRow = {
  id: string;
  type: "stdio" | "ws";
  cmd: string;
  args?: string[];
  cmdArgs?: string;
  env?: Record<string, string> | string[];
  cmdEnv?: string;
  url?: string;
};

// 필요 시 네 기존 util 사용
function parseArgs(s?: string): string[] {
  if (!s) return [];
  return s.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(v => v.replace(/^"|"$/g, "")) ?? [];
}

function toArrayFromJson(value: unknown): any[] {
  // mcp_data가 배열이거나, { mcp_data: [...] }로 들어온 과거 포맷 방어
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const v: any = value;
    if (Array.isArray(v.mcp_data)) return v.mcp_data;
    if (Array.isArray(v.items?.[0]?.mcp_data)) return v.items[0].mcp_data; // 혹시 이런 래핑으로 저장된 적이 있다면
  }
  return [];
}

function normalizeMcpConfig(json: any): McpRow | null {
  if (!json || typeof json !== "object") return null;
  const id = String(json.id ?? "").trim();
  const cmd = String(json.cmd ?? "").trim();
  const type = (json.type ?? "stdio") as "stdio" | "ws";
  if (!id || !cmd) return null;

  return {
    id,
    type,
    cmd,
    args: Array.isArray(json.args) ? json.args : parseArgs(json.cmdArgs),
    cmdArgs: json.cmdArgs,
    env: json.env,      // 네가 가진 toEnvObject()에서 처리
    cmdEnv: json.cmdEnv,
    url: json.url,
  };
}

/**
 * user_mcp 테이블에서 mcp_data(JSON)로 관리되는 MCP 설정들을 꺼내고,
 * 선택적으로 mcpIds로 필터링해서 McpRow[]로 반환.
 */
export async function getMcpRowsFromUser(opts: {
  userId: string;
  mcpIds?: string[];
  useOnly?: boolean; // 사용 여부 컬럼이 있다면 필터 (기본 true)
}) {
  const { userId, mcpIds, useOnly = true } = opts;

  // 1) 사용자 레코드 조회 (여러 개일 수 있다고 가정: 최신/활성만 사용하고 싶다면 where에 조건 추가)
  // const rows = await prisma.user_mcp.findMany({
  //   where: {
  //     user_id: userId,
  //     ...(useOnly ? { use_yn: true } : {}),
  //   },
  //   select: {
  //     mcp_data: true, // JSON(B)
  //     updated_at: true,
  //     created_at: true,
  //   },
  //   orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
  // });
  const rows: any[] = [];

  // 2) JSON → 배열 펼치기
  const rawList: any[] = rows.flatMap(r => toArrayFromJson(r.mcp_data));

  // 3) 유효한 항목만 정규화
  let list: McpRow[] = rawList
    .map(normalizeMcpConfig)
    .filter((v): v is McpRow => !!v);

  // 4) mcpIds 지정 시 필터
  if (mcpIds?.length) {
    const idSet = new Set(mcpIds);
    list = list.filter(item => idSet.has(item.id));
  }

  // 5) 중복(id) 제거: 최신(앞쪽) 우선
  const seen = new Set<string>();
  const deduped: McpRow[] = [];
  for (const it of list) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    deduped.push(it);
  }

  return deduped;
}

export function withTimeout<T>(p: Promise<T>, ms: number, label = 'timeout'): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}