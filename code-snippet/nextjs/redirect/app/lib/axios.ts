import axios, { AxiosError, AxiosRequestConfig } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig { _retry?: boolean }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "";
const REFRESH_URL = "/api/auth/refresh";

/** 일반 클라이언트 */
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

/** 리프레시 전용 (인터셉터 비적용) */
const refreshApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// 요청 인터셉터: 로컬 토큰 → Authorization 헤더
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<any> | null = null;

function isAuthPath(url?: string) {
  if (!url) return false;
  return url.includes("/api/auth/login") || url.includes(REFRESH_URL);
}

function shouldAttemptRefresh(error: AxiosError, original?: AxiosRequestConfig & { _retry?: boolean }) {
  if (!original || original._retry) return false;
  if (isAuthPath(original.url ?? "")) return false;

  const status = error.response?.status;
  // 401은 당연히 리프레시 시도
  if (status === 401) return true;
  // 응답 자체가 없을 때(CORS/프리플라이트 차단 등) 네트워크 오류라면 1회 시도
  if (!status && (error.code === "ERR_NETWORK" || error.message?.includes("Network Error"))) {
    return true;
  }
  return false;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    // 리프레시 대상이 아니면 그대로 throw
    if (!shouldAttemptRefresh(error, original)) throw error;

    original!._retry = true;

    try {
      // 동시 401 → 리프레시 1번만 수행
      if (!refreshPromise) {
        refreshPromise = refreshApi.post(REFRESH_URL, {}); // withCredentials 이미 true
      }
      const refreshRes = await refreshPromise.finally(() => { refreshPromise = null; });

      // 서버가 바디로 새 액세스 토큰을 내려줌 (당신의 route.ts는 이미 이렇게 반환 중)
      const newAccess: string | undefined =
        refreshRes?.data?.accessToken ?? refreshRes?.data?.access_token;

      if (newAccess) {
        // 1) 로컬 저장/기본 헤더 갱신
        if (typeof window !== "undefined") {
          localStorage.setItem("token", newAccess);
        }
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
      } else {
        // 쿠키만 쓸 경우엔 기본 Authorization 제거 (서버가 쿠키로 인증)
        delete api.defaults.headers.common["Authorization"];
      }

      // 2) 원요청의 오래된 Authorization 제거(요청 인터셉터가 최신으로 채움)
      if (original?.headers) {
        delete (original.headers as any).Authorization;
        delete (original.headers as any).authorization;
      }
      original!.withCredentials = true;

      // 3) 원요청 재시도
      return api(original!);
    } catch (e) {
      // 리프레시 실패 → 세션 정리
      if (typeof window !== "undefined") localStorage.removeItem("token");
      // try { useAuth.getState().logout(); } catch {}
      throw e;
    }
  }
);
