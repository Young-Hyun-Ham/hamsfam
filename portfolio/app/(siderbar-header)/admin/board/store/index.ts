// app/(sidebar-header)/admin/board/store/index.ts
"use client";

import { create } from "zustand";
import type { AdminBoardCategory, AdminBoardRow, BoardQuery, Paging } from "../types";
import { api } from "@/lib/axios";

function iso(d: Date) {
  return d.toISOString();
}

function makeMock(count = 57): AdminBoardRow[] {
  const cats = ["notice", "faq", "qna", "general"] as const;
  return Array.from({ length: count }).map((_, i) => {
    const n = count - i;
    return {
      id: String(1000 + n),
      category: cats[n % cats.length],
      title: `샘플 게시글 ${n}`,
      content: `샘플 내용 ${n}\n\n관리자 보드 퍼블리싱 테스트입니다.`,
      tags: n % 3 === 0 ? ["alpha", "beta"] : n % 3 === 1 ? ["qna"] : [],
      authorName: n % 4 === 0 ? "익명" : "관리자",
      isSecret: n % 10 === 0,
      createdAt: iso(new Date(Date.now() - n * 1000 * 60 * 60)),
      updatedAt: iso(new Date(Date.now() - n * 1000 * 60 * 20)),
    };
  });
}

type ModalState =
  | { type: null }
  | { type: "create" }
  | { type: "edit"; id: string }
  | { type: "detail"; id: string }
  | { type: "delete"; id: string };

type ParamProps = {
    page: number;
    size: number;
    total: number;
    keyword?: string;
    tag?: string;
    category?: "all" | AdminBoardCategory;
};

type State = {
  // data
  // all: AdminBoardRow[];
  rows: AdminBoardRow[];
  paging: Paging;
  query: BoardQuery;

  // selection
  selectedId: string | null;

  // modals
  modal: ModalState;

  // actions
  setQuery: (patch: Partial<BoardQuery>) => void;
  setPage: (page: number) => void;
  open: (m: ModalState) => void;
  close: () => void;

  // crud (mock)
  fetchList: (params?: ParamProps) => void;
  createRow: (payload: Pick<AdminBoardRow, "category" | "title" | "content" | "tags" | "isSecret">) => void;
  updateRow: (id: string, payload: Partial<Pick<AdminBoardRow, "category" | "title" | "content" | "tags" | "isSecret">>) => void;
  deleteRow: (id: string) => void;

  // selectors
  getById: (id: string) => AdminBoardRow | undefined;
};

function filterRows(all: AdminBoardRow[], q: BoardQuery) {
  const kw = q.keyword.trim().toLowerCase();
  const tag = q.tag.trim().toLowerCase();

  return all.filter((r) => {
    if (q.category !== "all" && r.category !== q.category) return false;

    if (kw) {
      const hay = `${r.title}\n${r.content}\n${(r.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    if (tag) {
      const tags = (r.tags ?? []).map((t) => t.toLowerCase());
      if (!tags.includes(tag)) return false;
    }

    return true;
  });
}

function paginate(rows: AdminBoardRow[], page: number, size: number) {
  const start = (page - 1) * size;
  return rows.slice(start, start + size);
}

export const useAdminBoardStore = create<State>((set, get) => ({
  // all: [],
  rows: [],
  paging: { page: 1, size: 10, total: 0 },
  query: { keyword: "", tag: "", category: "all" },

  selectedId: null,
  modal: { type: null },

  // init: () => {
  //   const all = makeMock(73);
  //   const q = get().query;
  //   const filtered = filterRows(all, q);
  //   const { page, size } = get().paging;
  //   const pageFixed = 1;
  //   set({
  //     all,
  //     paging: { page: pageFixed, size, total: filtered.length },
  //     rows: paginate(filtered, pageFixed, size),
  //   });
  // },

  setQuery: (patch) => {
    const next = { ...get().query, ...patch };
    const all = get().rows;
    const filtered = filterRows(all, next);
    const size = get().paging.size;
    const page = 1;
    set({
      query: next,
      paging: { page, size, total: filtered.length },
      rows: paginate(filtered, page, size),
    });
  },

  setPage: (page) => {
    const { size } = get().paging;
    const filtered = filterRows(get().rows, get().query);
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    const nextPage = Math.min(Math.max(1, page), totalPages);
    set({
      paging: { page: nextPage, size, total: filtered.length },
      rows: paginate(filtered, nextPage, size),
    });
  },

  open: (m) => set({ modal: m, selectedId: "id" in m ? m.id : null }),
  close: () => set({ modal: { type: null } }),

  fetchList: async (payload) => {
    try {
      const { data } = await api.get("/api/admin/firebase/board", { params: payload });
      console.log(data)
    } catch(err) {
      console.log(err)
    }
  },

  createRow: (payload) => {
    const all = get().rows;
    const now = new Date();
    const row: AdminBoardRow = {
      id: String(Date.now()),
      category: payload.category,
      title: payload.title,
      content: payload.content,
      tags: payload.tags ?? [],
      authorName: "관리자",
      isSecret: payload.isSecret ?? false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const nextAll = [row, ...all];
    set({ rows: nextAll });
    get().setPage(1);
    get().setQuery({}); // refresh with current query
  },

  updateRow: (id, payload) => {
    const nextAll = get().rows.map((r) =>
      r.id === id
        ? {
            ...r,
            ...payload,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    set({ rows: nextAll });
    get().setQuery({});
  },

  deleteRow: (id) => {
    const nextAll = get().rows.filter((r) => r.id !== id);
    set({ rows: nextAll });
    const page = get().paging.page;
    get().setPage(page);
    get().setQuery({});
  },

  getById: (id) => get().rows.find((r) => r.id === id),
}));
