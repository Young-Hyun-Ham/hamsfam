import { create } from "zustand";
import * as backendUserService from "../services/backendServices";

import type {
  AdminUser,
  UserSearchParams,
  UserUpsertPayload,
} from "../types";

type StoreState = {
  fetchUserList: (params?: UserSearchParams) => Promise<AdminUser[]>;
  upsertUser: (payload: UserUpsertPayload) => Promise<AdminUser>;
  deleteUser: (idOrSub: string) => Promise<void>;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? "firebase";

const useUserStore = create<StoreState>((set, get) => ({
  fetchUserList: async (params = {}) => {
    return await backendUserService.fetchUserList(BACKEND, params);
  },

  upsertUser: async (payload) => {
    return await backendUserService.upsertUser(BACKEND, payload);
  },

  deleteUser: async (idOrSub) => {
    await backendUserService.deleteUser(BACKEND, idOrSub);
  },
}));

export default useUserStore;
