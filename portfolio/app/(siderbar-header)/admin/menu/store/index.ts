// app/(siderbar-header)/admin/menu/store/index.ts
import { create } from "zustand";

import { Menu, MenuSearchParams } from "../types/types";
import { api } from "@/lib/axios";

type StoreState = {
  fetchMenuList: (params: any) => Promise<Menu[]>;
  createMenu: (data: Menu) => Promise<string>;
  updateMenu: (id: string, data: Menu) => Promise<void>;
  deleteMenuById: (id: string) => Promise<void>;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? 'firebase';
const BASE_PATH = `/api/admin/${BACKEND}/menu`;

const useMenuStore = create<StoreState>((set, get) => ({

  /**
   * 목록 조회
   * - GET /api/firebase/admin/menu?lev=1&searchText=...
   */
  fetchMenuList: async (params: MenuSearchParams = {}): Promise<Menu[]> => {
    const { lev, searchText } = params;
    const res = await api.get(BASE_PATH, {
      params: {
        // lev가 undefined면 쿼리스트링에서 빠짐
        lev,
        searchText,
      },
    });
  
    const items = (res.data?.items ?? []) as Menu[];
    return items;
  },
  /**
   * 등록
   * - Next.js 백엔드(/api/admin/firebase/menu)에 위임
   * - 백엔드는 lev / up_id / order 기준으로 중간삽입 + 순번 밀기 처리
   * - 응답: { id: string; item: Menu } 형태를 가정
   */
  createMenu: async (data: Menu) => {
    const res = await api.post(BASE_PATH, data);
  
    // 백엔드에서 반환하는 id 형식에 맞춰 사용
    const id = res.data?.id ?? res.data?.item?.id;
    if (!id) {
      throw new Error("메뉴 생성 응답에서 id를 찾을 수 없습니다.");
    }
    return id;
  },
  /**
   * 수정
   * - Next.js 백엔드(/api/admin/firebase/menu/[id])에 위임
   * - 서버에서 그룹 이동 / 순번 이동 로직 처리
   */
  updateMenu: async (id: string, data: Menu): Promise<void> => {
    await api.patch(`${BASE_PATH}/${id}`, data);
  },
  /**
   * 삭제
   * - Next.js 백엔드(/api/admin/firebase/menu/[id])에 위임
   * - 서버에서 같은 그룹 내 order 당기기(-1)까지 처리
   */
  deleteMenuById: async (id: string): Promise<void> => {
    await api.delete(`${BASE_PATH}/${id}`);
  },
}));

export default useMenuStore;