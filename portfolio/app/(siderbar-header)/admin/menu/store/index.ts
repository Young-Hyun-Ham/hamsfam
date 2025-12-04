// app/(siderbar-header)/admin/menu/store/index.ts
import { create } from "zustand";

import * as backendService from '../services/backendService';
import { Menu, MenuSearchParams } from "../types/types";

type StoreState = {

  fetchMenuList: (params: any) => Promise<Menu[]>;
  createMenu: (data: Menu) => Promise<string>;
  updateMenu: (id: string, data: Menu) => void;
  deleteMenuById: (id: string) => void;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? 'firebase';

const useMenuStore = create<StoreState>((set, get) => ({

  fetchMenuList: async (params: MenuSearchParams = {}) => {
    return await backendService.fetchMenuList(BACKEND, params);
  },
  createMenu: async (data: Menu) => {
    return await backendService.createMenu(BACKEND, data);
  },
  updateMenu: async (id: string, data: Menu) => {
    return await backendService.updateMenu(BACKEND, id, data);
  },
  deleteMenuById: async (id: string) => {
    await backendService.deleteMenuById(BACKEND, id);
  },
}));

export default useMenuStore;