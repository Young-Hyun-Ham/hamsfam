// app/(siderbar-header)/admin/knowledge/util/index.ts

import { AxiosError, AxiosRequestConfig } from "axios";
import { api } from "@/lib/axios";

/**
 * 공통: fetch 헬퍼
 * 
 * 사용 예:
 *  fetchRequestJSON<Project[]>(`${BASE}/projects`);
 *  await requestJSON<KnowledgeProject>(`${BASE}/projects`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
 */
export async function fetchRequestJSON<T>(
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

/**
 * 공통: axios JSON 요청 헬퍼
 *
 * 사용 예:
 *  axiosRequestJSON<Project[]>({
 *    method: "GET",
 *    url: "/api/admin/firebase/knowledge/projects",
 *  })
 */
export async function axiosRequestJSON<T>(
  config: AxiosRequestConfig
): Promise<T> {
  try {
    const res = await api.request<T>({
      ...config,
      headers: {
        "Content-Type": "application/json",
        ...(config.headers ?? {}),
      },
    });

    return res.data;
  } catch (err) {
    const error = err as AxiosError;

    const status = error.response?.status;
    const data = error.response?.data;

    console.error("API 호출 실패", status, data);

    throw new Error(
      `API 호출 실패${status ? ` (${status})` : ""}`
    );
  }
}