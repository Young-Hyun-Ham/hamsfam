// app/(sidebar-header)/admin/board/store/index.ts
"use client";

import { create } from "zustand";
import type { roleTypes } from "@/types/user";
import type { AdminBoardRow, AdminUser, BoardQuery, BoardReply, ModalState, Paging, ParamProps, ReplyCreateInput } from "../types";
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

  // crud
  fetchList: (params?: ParamProps) => void;
  createRow: (payload: Pick<AdminBoardRow, "slug" | "title" | "content" | "tags" | "password">) => void;
  updateRow: (id: string, payload: Partial<Pick<AdminBoardRow, "slug" | "title" | "content" | "tags">>) => void;
  deleteRow: (id: string) => void;

  // selectors
  getById: (id: string) => AdminBoardRow | undefined;

  // reply crud
  repliesByPostId: Record<string, BoardReply[]>;
  replyFetch: (postId: string) => Promise<void>;
  replyCreate: (payload: ReplyCreateInput) => Promise<BoardReply | null>;
  
  replyUpdate: (payload: { postId: string; replyId: string; content: string, actorRoles: roleTypes[] }) => Promise<boolean>;
  replyDelete: (payload: { postId: string; replyId: string, actorRoles: roleTypes[] }) => Promise<boolean>;
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

  setQuery: (q) => set({ query: { ...get().query, ...q } }),

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
      
      set({
        rows: data.items ?? [],
        paging: data.paging ?? {
          page: payload?.page ?? 1,
          size: payload?.size ?? 10,
          total: 0,
          hasMore: false,
        },
      });
    } catch(err) {
      console.log(err)
    }
  },

  createRow: async (payload) => {
    const all = get().rows;
    const row: AdminBoardRow = {
      id: "", // 서버에서 생성
      slug: payload.slug,
      title: payload.title,
      content: payload.content,
      tags: payload.tags ?? [],
      password: payload.password ?? "",
      hasPassword: payload.password ? true : false,
      authorId: "admin",
      authorName: "관리자",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { data } = await api.post(`/api/admin/${backend}/board`, row)
    const nextData = {
      ...row,
      id: data.id
    }
    const nextAll = [nextData, ...all];
    set({ rows: nextAll });
    get().setPage(1);
    get().setQuery({}); // refresh with current query
  },

  updateRow: async (id, payload) => {
    const nextAll = get().rows.map((r) =>
      r.id === id
        ? {
            ...r,
            ...payload,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    // console.log("payload =========> ", id, payload);
    const { data } = await api.patch(`/api/admin/${backend}/board/${id}`, payload);
    set({ rows: nextAll });
    get().setQuery({});
  },

  deleteRow: async (id) => {
    await api.delete(`/api/admin/${backend}/board/${id}`);
    
    const nextAll = get().rows.filter((r) => r.id !== id);
    set({ rows: nextAll });
    
    get().setQuery({});
  },

  getById: (id) => get().rows.find((r) => r.id === id),
    
  repliesByPostId: {},

  replyFetch: async (postId) => {
    if (!postId) return;
    const res = await api.get(`/api/admin/${backend}/board/replies`, { params: { postId } });
    const items: BoardReply[] = res.data?.items ?? [];

    // path 정렬(서버가 이미 정렬해주지만 안전하게 한번 더)
    items.sort((a, b) => (a.path ?? "").localeCompare(b.path ?? ""));

    set((s) => ({
      repliesByPostId: { ...s.repliesByPostId, [postId]: items ?? [] },
    }));
  },

  replyCreate: async (payload) => {
    const postId = payload.postId;
    const content = payload.content?.trim() ?? "";
    const parentId = payload.parentId ?? null;

    if (!postId || !content) return null;

    // ✅ 서버가 계산해야 하는 값(threadId/depth/path/createdAt...)은 클라에서 만들지 않는다
    const body = {
      postId,
      parentId,
      content,
      authorId: "admin",
      authorName: "관리자",
    };

    const res = await api.post(`/api/admin/${backend}/board/replies`, body);
    const item: BoardReply = res.data?.item;

    if (!item) return null;

    set((s) => {
      const prev = s.repliesByPostId[postId] ?? [];
      // path 기준 정렬(트리 정렬 유지)
      const next = [...prev, item].sort((a, b) => (a.path ?? "").localeCompare(b.path ?? ""));
      return { repliesByPostId: { ...s.repliesByPostId, [postId]: next } };
    });

    return item;
  },
  replyUpdate: async ({ postId, replyId, content, actorRoles }) => {
    const nextContent = content.trim();
    if (!postId || !replyId || !nextContent) return false;

    const res = await api.patch(`/api/admin/${backend}/board/replies/${replyId}`, {
      postId,
      content: nextContent,
      actorRoles,
    });

    const item: BoardReply | undefined = res.data?.item;
    if (!item) return false;

    set((s) => {
      const prev = s.repliesByPostId[postId] ?? [];
      const next = prev.map((r) => (r.id === replyId ? { ...r, ...item } : r));
      return { repliesByPostId: { ...s.repliesByPostId, [postId]: next } };
    });

    return true;
  },
  replyDelete: async ({ postId, replyId, actorRoles }) => {
    if (!postId || !replyId) return false;

    const res = await api.delete(`/api/admin/${backend}/board/replies/${replyId}`, {
      data: { postId, actorRoles },
    });

    const item: BoardReply | undefined = res.data?.item;
    if (!item) return false;

    // ✅ soft delete 반영(트리 유지)
    set((s) => {
      const prev = s.repliesByPostId[postId] ?? [];
      const next = prev.map((r) => (r.id === replyId ? { ...r, ...item } : r));
      return { repliesByPostId: { ...s.repliesByPostId, [postId]: next } };
    });

    return true;
  },
}));
