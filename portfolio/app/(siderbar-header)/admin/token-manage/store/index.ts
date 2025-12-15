// app/(sider-header)/admin/token-manage/store/index.ts
import { create } from "zustand";

import type {
  AdminTokenUser,
  ChargeUserTokenInput,
} from "../types";
import { api } from "@/lib/axios";

type StoreState = {
  users: AdminTokenUser[];
  history: any[],
  loading: boolean;
  error: string | null;

  fetchUserList: (params?: any) => Promise<AdminTokenUser[]>;
  chargeToken: (input: ChargeUserTokenInput) => Promise<void>;
  fetchHistory: (userId: string) => Promise<void>;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? 'firebase';
const BASE_PATH = `/api/admin/${BACKEND}/token-manage`;

const useUserTokenStore = create<StoreState>((set, get) => ({
  users: [],
  history: [],
  loading: false,
  error: null,

  /* ========================= 목록 조회 ========================= */
  fetchUserList: async (params) => {
    set({ loading: true, error: null });
    const { keyword } = params;

    const res = await api.get(BASE_PATH, {
      params: {
        keyword: keyword ?? "",
      },
    });

    const items = (res.data?.items ?? []) as AdminTokenUser[];
    set({ loading: false, error: null });
    return items;
  },
  /* ========================= 토큰 충전 ========================= */
  chargeToken: async (payload: ChargeUserTokenInput) => {
    set({ loading: true, error: null });
    await api.post(`${BASE_PATH}`, payload);
    set({ loading: false, error: null });
  },
  /* ========================= 충전 History 조회 ========================= */
  fetchHistory: async (userId) => {
    set({ loading: true, error: null });
    const res = await api.get(`${BASE_PATH}/${encodeURIComponent(userId)}`);
    // 백엔드에서 이미 형식 맞춰서 내려주므로 그대로 리턴
    set({ history: res.data?.items ?? [], loading: false });
  },
}));

export default useUserTokenStore;
