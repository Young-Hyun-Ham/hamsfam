// app/(sidebar-header)/admin/board/store/index.ts
"use client";

import { create } from "zustand";
import type { AdminBoardRow, BoardQuery, ModalState, Paging, ParamProps } from "../types";
import { api } from "@/lib/axios";
import { normalize } from "@/lib/utils/utils";

export function selectFilteredPosts(items: AdminBoardRow[], query: BoardQuery) {
  const kw = normalize(query.keyword).toLowerCase();
  const tag = normalize(query.tag).toLowerCase();

  return items.filter((it) => {
    const hay = `${it.title} ${it.content} ${(it.tags ?? []).join(" ")}`.toLowerCase();
    const okKw = kw ? hay.includes(kw) : true;
    const okTag = tag ? (it.tags ?? []).some((t) => t.toLowerCase() === tag) : true;
    return okKw && okTag;
  });
}

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
  createRow: (payload: Pick<AdminBoardRow, "slug" | "title" | "content" | "tags" | "password">) => void;
  updateRow: (id: string, payload: Partial<Pick<AdminBoardRow, "slug" | "title" | "content" | "tags">>) => void;
  deleteRow: (id: string) => void;

  // selectors
  getById: (id: string) => AdminBoardRow | undefined;
};

const backend = process.env.NEXT_PUBLIC_BACKEND ?? "firebase";
const PAGE_SIZE = 10;
const PAGE_NUM = 1;

function paginate(rows: AdminBoardRow[], page: number, size: number) {
  const start = (page - 1) * size;
  return rows.slice(start, start + size);
}

export const useAdminBoardStore = create<State>((set, get) => ({
  // all: [],
  rows: [],
  paging: { page: PAGE_NUM, size: PAGE_SIZE, total: 0 },
  query: { keyword: "", tag: "", slug: "all" },

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

  setQuery: (q) => set({ query: { ...get().query, ...q } }),
  // setQuery: (patch) => {
  //   const next = { ...get().query, ...patch };
  //   const all = get().rows;
  //   const filtered = filterRows(all, next);
  //   const size = get().paging.size ?? 10;
  //   const page = get().paging.page ?? 1;
  //   set({
  //     query: next,
  //     paging: { page, size, total: filtered.length },
  //     rows: paginate(filtered, page, size),
  //   });
  // },

  setPage: (page) => {
    const { size } = get().paging;
    const filtered = selectFilteredPosts(get().rows, get().query);
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    const nextPage = Math.min(Math.max(1, page), totalPages);
    set({
      paging: { page: nextPage, size, total: filtered.length },
      rows: paginate(filtered, nextPage, size),
    });
  },

  open: (m) => set({ modal: m, selectedId: "id" in m ? m.id : null }),
  close: () => set({ modal: { type: null }, selectedId: null }),

  fetchList: async (payload) => {
    try {
      const { data } = await api.get(`/api/admin/${backend}/board`, { params: payload });
      console.log(data)
      set({ rows: data.items });
    } catch(err) {
      console.log(err)
    }
  },

  createRow: async (payload) => {
    const all = get().rows;
    const now = new Date();
    const row: AdminBoardRow = {
      id: String(Date.now()),
      slug: payload.slug,
      title: payload.title,
      content: payload.content,
      tags: payload.tags ?? [],
      password: payload.password ?? "",
      hasPassword: payload.password ? true : false,
      authorName: "관리자",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await api.post(`/api/admin/${backend}/board`, payload)
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

  deleteRow: async (id) => {
    // await api.delete(`/api/admin/${backend}/board/${id}`);
    
    const nextAll = get().rows.filter((r) => r.id !== id);
    set({ rows: nextAll });
    
    get().setQuery({});
  },

  getById: (id) => get().rows.find((r) => r.id === id),
}));
