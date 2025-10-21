// src/api.ts
import axios from 'axios';
import { useAuth } from './login/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://hamfas-chatting-backend.vercel.app';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

/** 훅 안에서 쓰고 싶다면 커스텀 훅으로 */
export function useApi() {
  const { token } = useAuth();
  api.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config;
  });
  return api;
};
