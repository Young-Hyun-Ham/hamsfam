// app/(sidebar-header)/admin/knowledge/dto/firebaseApi.ts
"use client";

import type {
  KnowledgeProject,
  KnowledgeIntent,
  KnowledgeEntity,
} from "../types";

/**
 * 공통: fetch 헬퍼
 */
async function requestJSON<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Firebase API error", res.status, text);
    throw new Error(`Firebase API 호출 실패 (${res.status})`);
  }

  return (await res.json()) as T;
}

// 베이스 URL (필요하면 prefix 변경)
const BASE = "/api/firebase/admin/knowledge";

/**
 * 1) 프로젝트 관련 API
 */

// 프로젝트 목록 조회
export async function fetchProjects(): Promise<KnowledgeProject[]> {
  const data = await requestJSON<{ items: KnowledgeProject[] }>(
    `${BASE}/projects`,
  );
  return data.items ?? [];
}

// 단일 프로젝트 조회 (필요시)
export async function fetchProject(
  projectId: string,
): Promise<KnowledgeProject> {
  const data = await requestJSON<KnowledgeProject>(
    `${BASE}/projects/${projectId}`,
  );
  return data;
}

// 프로젝트 생성
export async function createProject(
  payload: Partial<KnowledgeProject>,
): Promise<KnowledgeProject> {
  const data = await requestJSON<KnowledgeProject>(`${BASE}/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

// 프로젝트 수정
export async function updateProject(
  projectId: string,
  payload: Partial<KnowledgeProject>,
): Promise<KnowledgeProject> {
  const data = await requestJSON<KnowledgeProject>(
    `${BASE}/projects/${projectId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return data;
}

// 프로젝트 삭제
export async function deleteProject(projectId: string): Promise<void> {
  await requestJSON<unknown>(`${BASE}/projects/${projectId}`, {
    method: "DELETE",
  });
}

/**
 * 2) 인텐트 관련 API
 */

// 특정 프로젝트의 인텐트 목록 조회
export async function fetchIntents(
  projectId: string,
): Promise<KnowledgeIntent[]> {
  const data = await requestJSON<{ items: KnowledgeIntent[] }>(
    `${BASE}/projects/${projectId}/intents`,
  );
  return data.items ?? [];
}

// 단일 인텐트 조회
export async function fetchIntent(
  projectId: string,
  intentId: string,
): Promise<KnowledgeIntent> {
  const data = await requestJSON<KnowledgeIntent>(
    `${BASE}/projects/${projectId}/intents/${intentId}`,
  );
  return data;
}

// 인텐트 생성/수정 (id 유무에 따라 upsert 느낌으로 사용 가능)
export async function upsertIntent(
  projectId: string,
  payload: Partial<KnowledgeIntent> & { id?: string },
): Promise<KnowledgeIntent> {
  if (payload.id) {
    // 업데이트
    const data = await requestJSON<KnowledgeIntent>(
      `${BASE}/projects/${projectId}/intents/${payload.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return data;
  }

  // 신규 생성
  const data = await requestJSON<KnowledgeIntent>(
    `${BASE}/projects/${projectId}/intents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data;
}

// 인텐트 삭제
export async function deleteIntent(
  projectId: string,
  intentId: string,
): Promise<void> {
  await requestJSON<unknown>(
    `${BASE}/projects/${projectId}/intents/${intentId}`,
    {
      method: "DELETE",
    },
  );
}

/**
 * 3) 엔티티 관련 API
 */

// 특정 프로젝트의 엔티티 목록
export async function fetchEntities(
  projectId: string,
): Promise<KnowledgeEntity[]> {
  const data = await requestJSON<{ items: KnowledgeEntity[] }>(
    `${BASE}/projects/${projectId}/entities`,
  );
  return data.items ?? [];
}

// 단일 엔티티 조회
export async function fetchEntity(
  projectId: string,
  entityId: string,
): Promise<KnowledgeEntity> {
  const data = await requestJSON<KnowledgeEntity>(
    `${BASE}/projects/${projectId}/entities/${entityId}`,
  );
  return data;
}

// 엔티티 생성/수정 (upsert)
export async function upsertEntity(
  projectId: string,
  payload: Partial<KnowledgeEntity> & { id?: string },
): Promise<KnowledgeEntity> {
  if (payload.id) {
    const data = await requestJSON<KnowledgeEntity>(
      `${BASE}/projects/${projectId}/entities/${payload.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return data;
  }

  const data = await requestJSON<KnowledgeEntity>(
    `${BASE}/projects/${projectId}/entities`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data;
}

// 엔티티 삭제
export async function deleteEntity(
  projectId: string,
  entityId: string,
): Promise<void> {
  await requestJSON<unknown>(
    `${BASE}/projects/${projectId}/entities/${entityId}`,
    {
      method: "DELETE",
    },
  );
}
