import { create } from "zustand";
import * as backendService from "../services/backendServices";

import type {
  AdminTokenUser,
  ChargeUserTokenInput,
} from "../types";

type StoreState = {
  users: AdminTokenUser[];
  history: any[],
  loading: boolean;
  error: string | null;

  fetchUserList: (params?: any) => Promise<AdminTokenUser[]>;
  chargeToken: (input: ChargeUserTokenInput) => Promise<void>;
  fetchHistory: (userId: string) => Promise<void>;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? "firebase";

const useUserTokenStore = create<StoreState>((set, get) => ({
  users: [],
  history: [],
  loading: false,
  error: null,

  // 사용자 + 토큰 목록 로드
  fetchUserList: async (params) => {
    try {
      set({ loading: true, error: null });
      const items = await backendService.fetchUserList(BACKEND, params ?? {});
      set({ users: items, loading: false });
      return items;
    } catch (err: any) {
      console.error(err);
      set({
        error: err?.message ?? "사용자 조회 실패",
        loading: false,
      });
      return [];
    }
  },

  // 토큰 충전
  chargeToken: async (args: ChargeUserTokenInput) => {
    try {
      set({ loading: true, error: null });

      await backendService.chargeUserToken(BACKEND, args);

      // 간단하게 전체 목록 다시 로딩
      const { fetchUserList } = get();
      await fetchUserList();

      set({ loading: false });
    } catch (err: any) {
      console.error(err);
      set({
        error: err?.message ?? "토큰 충전 실패",
        loading: false,
      });
      throw err; // 컴포넌트에서 alert 등 처리할 수 있게
    }
  },
  fetchHistory: async (userId) => {
    try {
      set({ loading: true, error: null });
      const list = await backendService.fetchUserTokenHistory(BACKEND, userId);
      set({ history: list, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));

export default useUserTokenStore;
