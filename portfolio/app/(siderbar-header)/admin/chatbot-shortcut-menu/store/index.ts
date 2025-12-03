// app/(sidebar-header)/admin/chatbot-shortcut-menu/store/index.ts
"use client";

import { create } from "zustand";

import * as backendService from "../services/backendService";
import {
  ShortcutMenu,
  ShortcutMenuSearchParams,
} from "../types/types";

type StoreState = {
  fetchShortcutMenuList: (params: ShortcutMenuSearchParams) => Promise<ShortcutMenu[]>;
  createShortcutMenu: (data: ShortcutMenu) => Promise<string>;
  updateShortcutMenu: (id: string, data: ShortcutMenu) => Promise<void>;
  deleteShortcutMenuById: (id: string) => Promise<void>;
};

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND as "firebase" | "postgres") ?? "firebase";

const useShortcutMenuStore = create<StoreState>(() => ({
  fetchShortcutMenuList: async (params: ShortcutMenuSearchParams = {}) => {
    return await backendService.fetchShortcutMenuList(BACKEND, params);
  },
  createShortcutMenu: async (data: ShortcutMenu) => {
    return await backendService.createShortcutMenu(BACKEND, data);
  },
  updateShortcutMenu: async (id: string, data: ShortcutMenu) => {
    return await backendService.updateShortcutMenu(BACKEND, id, data);
  },
  deleteShortcutMenuById: async (id: string) => {
    await backendService.deleteShortcutMenu(BACKEND, id);
  },
}));

export default useShortcutMenuStore;
