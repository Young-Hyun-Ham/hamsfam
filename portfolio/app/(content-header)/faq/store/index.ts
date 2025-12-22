// app/(content-header)/faq/store/index.ts
"use client";

import { create } from "zustand";
import { api } from "@/lib/axios";
import type {
  PublicFaq,
  PublicFaqQuery,
  PublicFaqCategory,
} from "../types";

/** ✅ 사용자 FAQ API base (firebase/postgres 토글) */
function getPublicFaqApiBase() {
  const backend =
    process.env.NEXT_PUBLIC_BACKEND === "postgres" ? "postgres" : "firebase";
  return `/api/board/${backend}/faq`;
}

type State = {
  loading: boolean;
  error: string | null;

  items: PublicFaq[];
  openId: string | null;

  query: PublicFaqQuery;

  // ✅ pagination
  page: number;
  limit: number;
  cursor: string | null;
  cursorStack: (string | null)[];
  hasMore: boolean;
  nextCursor: string | null;

  // actions
  setQuery: (q: Partial<PublicFaqQuery>) => void;
  toggleOpen: (id: string) => void;

  fetchFaqs: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
};

const PAGE_LIMIT: number = 7;
const usePublicFaqStore = create<State>((set, get) => ({
  loading: false,
  error: null,

  items: [],
  openId: null,

  query: { keyword: "", category: "all" },

  // pagination init
  page: 1,
  limit: PAGE_LIMIT,
  cursor: null,
  cursorStack: [null],
  hasMore: false,
  nextCursor: null,

  setQuery: (q) =>
    set((s) => ({
      query: { ...s.query, ...q },
      // ✅ 검색/카테고리 바뀌면 1페이지로 리셋
      page: 1,
      cursor: null,
      cursorStack: [null],
      hasMore: false,
      nextCursor: null,
      openId: null,
    })),

  toggleOpen: (id) =>
    set((s) => ({
      openId: s.openId === id ? null : id,
    })),

  fetchFaqs: async () => {
    const base = getPublicFaqApiBase();
    const { query, cursor, limit } = get();

    set({ loading: true, error: null });

    try {
      const res = await api.get(base, {
        params: {
          keyword: (query.keyword ?? "").trim(),
          category: query.category ?? "all",
          limit,
          cursor,
        },
      });

      const items: PublicFaq[] = res.data?.items ?? [];
      const nextCursor = res.data?.nextCursor ?? null;
      const hasMore = Boolean(res.data?.hasMore);

      set({
        items,
        nextCursor,
        hasMore,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({
        loading: false,
        error: e?.message ?? "사용자 FAQ 조회 실패",
      });
    }
  },

  nextPage: async () => {
    const { loading, hasMore, nextCursor, cursorStack, page } = get();
    if (loading) return;
    if (!hasMore || !nextCursor) return;

    set({
      cursor: nextCursor,
      cursorStack: [...cursorStack, nextCursor],
      page: page + 1,
      openId: null,
    });

    await get().fetchFaqs();
  },

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
      openId: null,
    });

    await get().fetchFaqs();
  },
}));

export default usePublicFaqStore;
