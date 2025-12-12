import { KnowledgeProject, KnowledgeIntent, KnowledgeEntity } from "../types";
// import { getBackendBaseUrl } from "@/lib/backend"; // 기존 패턴 따라가기

const BASE = "/api/postgres/admin/knowledge";

export async function fetchProjects(): Promise<KnowledgeProject[]> {
  const res = await fetch(`${BASE}/projects`, { cache: "no-store" });
  if (!res.ok) throw new Error("프로젝트 목록 조회 실패");
  const data = await res.json();
  return data.items;
}

export async function createProject(payload: Partial<KnowledgeProject>) {
  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("프로젝트 생성 실패");
  return res.json();
}

// 이 밑에 intents / entities 용 API들
export async function fetchIntents(projectId: string): Promise<KnowledgeIntent[]> {
  const res = await fetch(`${BASE}/projects/${projectId}/intents`, { cache: "no-store" });
  if (!res.ok) throw new Error("인텐트 목록 조회 실패");
  const data = await res.json();
  return data.items;
}


// 이 밑에 intents / entities 용 API들
export async function fetchEntities(projectId: string): Promise<KnowledgeEntity[]> {
  const res = await fetch(`${BASE}/projects/${projectId}/entities`, { cache: "no-store" });
  if (!res.ok) throw new Error("엔티티 목록 조회 실패");
  const data = await res.json();
  return data.items;
}
