"use client";

import { create } from "zustand";
import { api } from "@/lib/axios";
import type { AdminFaq, FaqListQuery } from "../types";

function getFaqApiBase() {
  const backend =
    process.env.NEXT_PUBLIC_BACKEND === "postgres" ? "postgres" : "firebase";
  return `/api/admin/${backend}/board/faq`;
}

type FaqState = {
  loading: boolean;
  error: string | null;

  items: AdminFaq[];
  selectedId: string | null;

  query: FaqListQuery;

  // pagination state
  page: number;
  limit: number;
  cursor: string | null;
  cursorStack: (string | null)[];
  hasMore: boolean;
  nextCursor: string | null;

  // ui
  upsertOpen: boolean;
  deleteOpen: boolean;

  // actions
  fetchFaqs: () => Promise<void>;
  setQuery: (q: Partial<FaqListQuery>) => void;

  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;

  select: (id: string | null) => void;

  openCreate: () => void;
  openEdit: (id: string) => void;
  closeUpsert: () => void;

  openDelete: (id: string) => void;
  closeDelete: () => void;

  createFaq: (input: any) => Promise<void>;
  updateFaq: (id: string, patch: any) => Promise<void>;
  deleteFaq: (id: string) => Promise<void>;
};

const PAGE_LIMIT: number = 7;
const useAdminFaqStore = create<FaqState>((set, get) => ({
  loading: false,
  error: null,

  items: [],
  selectedId: null,

  query: { keyword: "", category: "all", status: "all" },

  // ✅ pagination init
  page: 1,
  limit: PAGE_LIMIT,
  cursor: null,
  cursorStack: [null],
  hasMore: false,
  nextCursor: null,

  upsertOpen: false,
  deleteOpen: false,

  fetchFaqs: async () => {
    const base = getFaqApiBase();
    const { query, cursor, limit } = get();

    set({ loading: true, error: null });

    try {
      const res = await api.get(base, {
        params: {
          keyword: query.keyword?.trim() || "",
          category: query.category ?? "all",
          status: query.status ?? "all",
          limit: query.limit ?? limit ?? PAGE_LIMIT,
          cursor,
        },
      });

      const items: AdminFaq[] = res.data?.items ?? [];
      const nextCursor = res.data?.nextCursor ?? null;
      const hasMore = Boolean(res.data?.hasMore);

      set((s) => ({
        items,
        nextCursor,
        hasMore,
        loading: false,
        error: null,
        // 페이지 넘어갈 때 선택이 깨지지 않게
        selectedId:
          s.selectedId && items.some((it) => it.id === s.selectedId)
            ? s.selectedId
            : items[0]?.id ?? null,
      }));
    } catch (e: any) {
      set({
        loading: false,
        error: e?.message ?? "FAQ 목록 조회 실패",
      });
    }
  },

  /** ✅ 검색/필터 바뀌면 무조건 1페이지 리셋 */
  setQuery: (q) =>
    set((s) => ({
      query: { ...s.query, ...q },
      page: 1,
      limit: (q as any)?.limit ?? s.limit ?? PAGE_LIMIT,
      cursor: null,
      cursorStack: [null],
      hasMore: false,
      nextCursor: null,
    })),

  /** ✅ 다음 페이지: nextCursor를 cursor로 세팅 + fetch */
  nextPage: async () => {
    const { loading, hasMore, nextCursor, cursorStack, page } = get();
    if (loading) return;
    if (!hasMore || !nextCursor) return;

    set({
      cursor: nextCursor,
      cursorStack: [...cursorStack, nextCursor],
      page: page + 1,
    });

    await get().fetchFaqs();
  },

  /** ✅ 이전 페이지: cursorStack pop + fetch */
  prevPage: async () => {
    const { loading, cursorStack, page } = get();
    if (loading) return;
    if (page <= 1) return;

    const nextStack = cursorStack.slice(0, -1);
    const prevCursor = nextStack[nextStack.length - 1] ?? null;

    set({
      cursorStack: nextStack,
      cursor: prevCursor,
      page: page - 1,
    });

    await get().fetchFaqs();
  },

  select: (id) => set({ selectedId: id }),

  openCreate: () => set({ upsertOpen: true, selectedId: null }),
  openEdit: (id) => set({ upsertOpen: true, selectedId: id }),
  closeUpsert: () => set({ upsertOpen: false }),

  openDelete: (id) => set({ deleteOpen: true, selectedId: id }),
  closeDelete: () => set({ deleteOpen: false }),

  createFaq: async (input) => {
    const base = getFaqApiBase();
    set({ loading: true, error: null });
    try {
      await api.post(base, input);
      set({ upsertOpen: false, page: 1, cursor: null, cursorStack: [null] });
      await get().fetchFaqs();
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "FAQ 등록 실패" });
    }
  },

  updateFaq: async (id, patch) => {
    const base = getFaqApiBase();
    set({ loading: true, error: null });
    try {
      await api.patch(base, patch, { params: { id } });
      set({ upsertOpen: false });
      await get().fetchFaqs();
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "FAQ 수정 실패" });
    }
  },

  deleteFaq: async (id) => {
    const base = getFaqApiBase();
    set({ loading: true, error: null });
    try {
      await api.delete(base, { params: { id } });
      set({ deleteOpen: false });
      // 삭제 후 현재 페이지가 비면 1페이지로 보내는 게 안전
      set((s) => ({
        page: Math.max(1, s.page),
      }));
      await get().fetchFaqs();
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "FAQ 삭제 실패" });
    }
  },
}));

export default useAdminFaqStore;
