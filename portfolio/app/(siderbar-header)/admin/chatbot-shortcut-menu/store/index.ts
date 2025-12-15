// app/(sidebar-header)/admin/chatbot-shortcut-menu/store/index.ts
"use client";

import { create } from "zustand";
import {
  ShortcutMenu,
  ShortcutMenuSearchParams,
} from "../types/types";
import { api } from "@/lib/axios";

type StoreState = {
  fetchShortcutMenuList: (params: ShortcutMenuSearchParams) => Promise<ShortcutMenu[]>;
  createShortcutMenu: (data: ShortcutMenu) => Promise<string>;
  updateShortcutMenu: (id: string, data: ShortcutMenu) => Promise<void>;
  deleteShortcutMenuById: (id: string) => Promise<void>;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? 'firebase';
const BASE_PATH = `/api/admin/${BACKEND}/shortcut-menu`;

const useShortcutMenuStore = create<StoreState>(() => ({
  fetchShortcutMenuList: async (params: ShortcutMenuSearchParams = {}) => {
    const { group, searchText } = params;
    const res = await api.get(BASE_PATH, {
      params: {
        group,
        searchText,
      },
    });
  
    const items = (res.data?.items ?? []) as ShortcutMenu[];
    return items;
  },
  createShortcutMenu: async (data: ShortcutMenu) => {
    const res = await api.post(BASE_PATH, data);
  
    // 백엔드에서 반환하는 id 형식에 맞춰 사용
    const id = res.data?.id ?? res.data?.item?.id;
    if (!id) {
      throw new Error("shortcut 메뉴 생성 응답에서 id를 찾을 수 없습니다.");
    }
    return id;
  },
  updateShortcutMenu: async (id: string, data: ShortcutMenu): Promise<void> => {
    await api.patch(`${BASE_PATH}/${id}`, data);
  },
  deleteShortcutMenuById: async (id: string): Promise<void> => {
    await api.delete(`${BASE_PATH}/${id}`);
  },
}));

export default useShortcutMenuStore;
