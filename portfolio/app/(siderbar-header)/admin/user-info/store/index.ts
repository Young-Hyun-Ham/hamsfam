// app/(siderbar-header)/admin/user-info/store/index.ts
import { create } from "zustand";

import type {
  AdminUser,
  UserSearchParams,
  UserUpsertPayload,
} from "../types";
import { api } from "@/lib/axios";

type StoreState = {
  fetchUserList: (params?: UserSearchParams) => Promise<AdminUser[]>;
  upsertUser: (payload: UserUpsertPayload) => Promise<AdminUser>;
  deleteUser: (idOrSub: string) => Promise<void>;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? "firebase";
const BASE_PATH = `/api/admin/${BACKEND}/user-info`;

const useUserStore = create<StoreState>((set, get) => ({
  fetchUserList: async (params = {}): Promise<AdminUser[]> => {
    const res = await api.get(BASE_PATH, {
      params: {
        keyword: params.keyword ?? "",
      },
    });

    const items = (res.data?.items ?? []) as AdminUser[];
    return items;
  },

  upsertUser: async (payload): Promise<AdminUser> => {
    const res = await api.post(BASE_PATH, payload);
    return res.data as AdminUser;
  },

  deleteUser: async (idOrSub): Promise<void> => {
    await api.delete(`${BASE_PATH}/${encodeURIComponent(idOrSub)}`);
  },
}));

export default useUserStore;
