// lib/axios.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig { _retry?: boolean }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

/** 일반 클라이언트 */
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// 요청 인터셉터: 로컬 토큰 → Authorization 헤더
api.interceptors.request.use((config) => {
  // if (typeof window !== "undefined") {
  //   const token = localStorage.getItem("token");
  //   if (token) config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

/** 응답 인터셉터 (공통 에러 로깅) */
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response) {
      console.error(
        "API Error",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("Network Error", error.message);
    }
    return Promise.reject(error);
  }
);