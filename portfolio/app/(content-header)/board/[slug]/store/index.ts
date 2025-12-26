// app/(content-header)/board/[slug]/store/index.ts
"use client";

import { create } from "zustand";
import { api } from "@/lib/axios";
import type {
  BoardPost,
  BoardQuery,
  BoardReply,
  CategoryPerm,
  CreateInput,
  PageInfo,
  UpdatePatch,
} from "../types";
import { useStore } from "@/store";

type State = {
  // route state
  slug: string;

  // data
  category: CategoryPerm | null;
  items: BoardPost[];

  // selection/ui
  selectedId: string | null;
  detailOpen: boolean;

  // query
  query: BoardQuery;

  // paging
  page: PageInfo;

  // status
  loading: boolean;
  saving: boolean;
  error: string | null;

  // state
  upsertOpen: boolean;
  deleteOpen: boolean;

  // replies state
  repliesByPostId: Record<string, BoardReply[]>;
  repliesLoading: boolean;
  repliesSaving: boolean;

  // actions
  openCreate: () => void;
  openEdit: (id: string) => void;
  openUpsert: () => void;
  closeUpsert: () => void;
  openDelete: () => void;
  closeDelete: () => void;

  setSlug: (slug: string) => void;
  setQuery: (q: Partial<BoardQuery>) => void;

  select: (id: string) => void;
  closeDetail: () => void;

  resetList: () => void;

  // read
  fetchPosts: (slug: string, opt?: { reset?: boolean }) => Promise<void>;
  fetchMore: () => Promise<void>;

  // crud
  createPost: (
    input: Omit<CreateInput, "slug"> & { slug?: string }
  ) => Promise<string | null>;
  updatePost: (id: string, patch: UpdatePatch) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;

  // replies
  fetchReplies: (postId: string) => Promise<void>;
  createReply: (postId: string, content: string) => Promise<string | null>;
  deleteReply: (replyId: string, postId?: string) => Promise<boolean>;
};

function normalize(v: any) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

function coerceDateString(v: any) {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v?.toDate === "function") {
    try {
      return v.toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  if (typeof v?.toString === "function") return v.toString();
  return undefined;
}

export function selectFilteredPosts(items: BoardPost[], query: BoardQuery) {
  const kw = normalize(query.keyword).toLowerCase();
  const tag = normalize(query.tag).toLowerCase();

  return items.filter((it) => {
    const hay = `${it.title} ${it.content} ${(it.tags ?? []).join(" ")}`.toLowerCase();
    const okKw = kw ? hay.includes(kw) : true;
    const okTag = tag ? (it.tags ?? []).some((t) => t.toLowerCase() === tag) : true;
    return okKw && okTag;
  });
}

function getApiBase() {
  const backend = (process.env.NEXT_PUBLIC_BACKEND ?? "firebase").toLowerCase();
  return backend === "postgres" ? "/api/board/postgres" : "/api/board/firebase";
}

function mapPost(it: any): BoardPost {
  return {
    ...it,
    createdAt: coerceDateString(it.createdAt),
    updatedAt: coerceDateString(it.updatedAt),
  };
}

function mapReply(it: any): BoardReply {
  return {
    ...it,
    createdAt: coerceDateString(it.createdAt),
    updatedAt: coerceDateString(it.updatedAt),
  };
}

function axiosErrMessage(e: any) {
  const status = e?.response?.status;
  const data = e?.response?.data;
  const msgFromServer =
    typeof data === "string"
      ? data
      : data?.message || data?.error || data?.detail;

  if (status && msgFromServer) return `HTTP ${status} ${msgFromServer}`;
  if (status) return `HTTP ${status}`;
  return e?.message ?? "failed";
}

function mapCategory(data: any, fallbackSlug: string): CategoryPerm | null {
  if (!data?.category) return null;
  return {
    slug: data.category.slug ?? fallbackSlug,
    name: data.category.name,
    edit: Boolean(data.category.edit),
    reply: Boolean(data.category.reply),
  };
}

function mapPageInfo(data: any, fallbackLimit: number): PageInfo {
  if (!data?.pageInfo) {
    return { limit: fallbackLimit, nextCursorId: null, hasMore: false };
  }
  return {
    limit: Number(data.pageInfo.limit ?? fallbackLimit),
    nextCursorId: data.pageInfo.nextCursorId ?? null,
    hasMore: Boolean(data.pageInfo.hasMore),
  };
}

/**
 * ✅ 프로젝트마다 API가 다를 수 있어서
 * - v1: /board/:id (REST path)
 * - v2: /board (body에 id) 또는 /board?id= (query)
 * 둘 다 자동 대응
 */
async function patchBoardAuto(base: string, id: string, body: any) {
  try {
    await api.patch(`${base}/board/${encodeURIComponent(id)}`, body);
    return;
  } catch (e: any) {
    const status = e?.response?.status;
    // 404면 "경로 방식 불일치"일 확률이 높아서 fallback
    if (status !== 404) throw e;
  }
  await api.patch(`${base}/board`, { id, ...body });
}

async function deleteBoardAuto(base: string, id: string) {
  try {
    await api.delete(`${base}/board/${encodeURIComponent(id)}`);
    return;
  } catch (e: any) {
    const status = e?.response?.status;
    if (status !== 404) throw e;
  }
  await api.delete(`${base}/board`, { params: { id } });
}

const usePublicBoardStore = create<State>((set, get) => ({
  slug: "",
  category: null,
  items: [],

  selectedId: null,
  detailOpen: false,

  query: {},

  page: {
    limit: 5,
    nextCursorId: null,
    hasMore: false,
  },

  loading: false,
  saving: false,
  error: null,

  upsertOpen: false,
  deleteOpen: false,

  repliesByPostId: {},
  repliesLoading: false,
  repliesSaving: false,

  openCreate: () => {
    const { category } = get();
    if (!category?.edit) {
      set({ error: "이 게시판은 글쓰기 권한이 없습니다." });
      return;
    }
    // 새 글은 편집 대상 제거가 핵심
    set({ upsertOpen: true, selectedId: null });
  },

  openEdit: (id: string) => {
    const { category } = get();
    if (!category?.edit) {
      set({ error: "이 게시판은 수정 권한이 없습니다." });
      return;
    }
    // 수정은 selectedId 지정
    set({ upsertOpen: true, selectedId: id });
  },

  openUpsert: () => {
    const { category } = get();
    if (!category?.edit) {
      set({ error: "이 게시판은 글쓰기 권한이 없습니다." });
      return;
    }
    set({ upsertOpen: true });
  },
  closeUpsert: () => set({ upsertOpen: false, selectedId: null, }),
  openDelete: () => set({ deleteOpen: true }),
  closeDelete: () => set({ deleteOpen: false }),

  setSlug: (slug) => set({ slug }),
  setQuery: (q) => set({ query: { ...get().query, ...q } }),

  select: (id) => {
    set({ selectedId: id, detailOpen: true });
    // ✅ 상세 열 때 댓글도 자동 로드(원치 않으면 제거 가능)
    void get().fetchReplies(id);
  },

  closeDetail: () => set({ detailOpen: false }),

  resetList: () =>
    set({
      items: [],
      selectedId: null,
      detailOpen: false,
      category: null,
      page: { ...get().page, nextCursorId: null, hasMore: false },
      repliesByPostId: {},
      error: null,
    }),

  fetchPosts: async (slug, opt) => {
    const reset = opt?.reset ?? true;

    const base = getApiBase();
    const { page, query: q } = get();
    const limitSize = page.limit;

    const keyword = normalize(q.keyword);
    const cursorId = reset ? "" : normalize(page.nextCursorId);

    set({ loading: true, error: null, slug });

    try {
      const params: Record<string, any> = {
        slug,
        limit: limitSize,
      };
      if (keyword) params.keyword = keyword;
      if (cursorId) params.cursorId = cursorId;

      const { data } = await api.get(`${base}/board`, { params });

      const category = mapCategory(data, slug);
      const pageInfo = mapPageInfo(data, limitSize);
      const incoming: BoardPost[] = (data.items ?? []).map(mapPost);

      set((s) => ({
        category,
        page: pageInfo,
        items: reset ? incoming : [...s.items, ...incoming],
        selectedId: reset ? null : s.selectedId,
        detailOpen: reset ? false : s.detailOpen,
      }));
    } catch (e: any) {
      set({ error: axiosErrMessage(e) });
    } finally {
      set({ loading: false });
    }
  },

  fetchMore: async () => {
    const { slug, page, loading } = get();
    if (!slug) return;
    if (loading) return;
    if (!page.hasMore || !page.nextCursorId) return;
    await get().fetchPosts(slug, { reset: false });
  },

  createPost: async (input) => {
    const base = getApiBase();
    const state = get();

    const { user } = useStore.getState();
    const authorId = user?.id ?? user?.uid ?? null;
    const authorName = user?.name ?? user?.displayName ?? user?.email ?? "익명";

    const slug = normalize(input.slug ?? state.slug);
    if (!slug) {
      set({ error: "slug is required" });
      return null;
    }

    // ✅ 프론트 가드
    if (state.category && !state.category.edit) {
      set({ error: "write not allowed" });
      return null;
    }

    const payload: CreateInput = {
      slug,
      title: normalize(input.title),
      content: normalize(input.content),
      password: normalize((input as any).password),
      authorId,
      authorName,
      tags: Array.isArray(input.tags)
        ? input.tags.map(normalize).filter(Boolean)
        : [],
      status: input.status ?? "published",
    };

    if (!payload.title) {
      set({ error: "title is required" });
      return null;
    }

    set({ saving: true, error: null });

    try {
      const { data } = await api.post(`${base}/board`, payload);
      const id = data?.id as string | undefined;

      await get().fetchPosts(slug, { reset: true });

      if (id) set({ selectedId: id, detailOpen: false });
      return id ?? null;
    } catch (e: any) {
      set({ error: axiosErrMessage(e) });
      return null;
    } finally {
      set({ saving: false });
    }
  },

  updatePost: async (id, patch) => {
    const base = getApiBase();
    const { category, slug } = get();

    if (category && !category.edit) {
      set({ error: "edit not allowed" });
      return false;
    }

    const body: any = {};
    if (patch.title !== undefined) body.title = normalize(patch.title);
    if (patch.content !== undefined) body.content = normalize(patch.content);
    if (patch.tags !== undefined) {
      body.tags = Array.isArray(patch.tags)
        ? patch.tags.map(normalize).filter(Boolean)
        : [];
    }
    if (patch.status !== undefined) body.status = patch.status;

    set({ saving: true, error: null });

    try {
      await patchBoardAuto(base, id, body);

      set((s) => ({
        items: s.items.map((it) =>
          it.id === id
            ? ({
                ...it,
                ...body,
                updatedAt: new Date().toISOString(),
              } as any)
            : it
        ),
      }));

      if (slug) await get().fetchPosts(slug, { reset: true });

      return true;
    } catch (e: any) {
      set({ error: axiosErrMessage(e) });
      return false;
    } finally {
      set({ saving: false });
    }
  },

  deletePost: async (id) => {
    const base = getApiBase();
    const { category, slug, selectedId } = get();

    if (category && !category.edit) {
      set({ error: "delete not allowed" });
      return false;
    }

    set({ saving: true, error: null });

    try {
      await deleteBoardAuto(base, id);

      set((s) => ({
        items: s.items.filter((it) => it.id !== id),
        selectedId: selectedId === id ? null : s.selectedId,
        detailOpen: selectedId === id ? false : s.detailOpen,
      }));

      if (slug) await get().fetchPosts(slug, { reset: true });

      return true;
    } catch (e: any) {
      set({ error: axiosErrMessage(e) });
      return false;
    } finally {
      set({ saving: false });
    }
  },

  // ---------------------------
  // replies
  // ---------------------------
  fetchReplies: async (postId) => {
    const base = getApiBase();
    const { category } = get();

    if (!postId) return;

    set({ repliesLoading: true, error: null });

    try {
      const { data } = await api.get(`${base}/board/replies`, {
        params: { postId },
      });

      // 서버가 canReply 내려주면 category.reply와 함께 동기화(선택)
      // (서버에서 category도 같이 내려주는 구조면 여기에서 맞추면 됨)
      if (typeof data?.canReply === "boolean") {
        set((s) => ({
          category: s.category
            ? { ...s.category, reply: Boolean(data.canReply) }
            : s.category,
        }));
      } else {
        // category가 없을 수 있어도 여기서 강제하진 않음
        void category;
      }

      const replies: BoardReply[] = (data.items ?? []).map(mapReply);

      set((s) => ({
        repliesByPostId: {
          ...s.repliesByPostId,
          [postId]: replies,
        },
      }));
    } catch (e: any) {
      set({ error: axiosErrMessage(e) });
    } finally {
      set({ repliesLoading: false });
    }
  },

  createReply: async (postId, content) => {
    const base = getApiBase();
    const { category } = get();

    const text = normalize(content);
    if (!postId) return null;
    if (!text) {
      set({ error: "content is required" });
      return null;
    }

    // ✅ reply 권한 프론트 가드
    if (category && !category.reply) {
      set({ error: "reply not allowed" });
      return null;
    }

    set({ repliesSaving: true, error: null });

    try {
      const { user } = useStore.getState();
      const authorId = user?.id ?? user?.uid ?? null;
      const authorName = user?.name ?? user?.displayName ?? user?.email ?? "익명";
      
      const { data } = await api.post(`${base}/board/replies`, {
        postId,
        content: text,
        authorId,
        authorName,
      });

      const id = data?.id as string | undefined;

      // ✅ 작성 후 재조회(서버가 최종)
      await get().fetchReplies(postId);

      return id ?? null;
    } catch (e: any) {
      set({ error: axiosErrMessage(e) });
      return null;
    } finally {
      set({ repliesSaving: false });
    }
  },

  deleteReply: async (replyId, postId) => {
    const base = getApiBase();
    const { category } = get();

    const id = normalize(replyId);
    if (!id) return false;

    // ✅ 삭제는 서버가 최종이지만, 프론트 가드도 걸어둠
    // (운영 정책에 따라 reply 또는 edit 중 하나만 있어도 허용하도록 서버에서 처리)
    if (category && !category.reply && !category.edit) {
      set({ error: "delete reply not allowed" });
      return false;
    }

    set({ repliesSaving: true, error: null });

    try {
      await api.delete(`${base}/board/replies`, { params: { id } });

      // 로컬 즉시 제거 + 재조회(선택)
      set((s) => {
        const pid = postId ?? s.selectedId ?? "";
        if (!pid) return s;

        const prev = s.repliesByPostId[pid] ?? [];
        return {
          ...s,
          repliesByPostId: {
            ...s.repliesByPostId,
            [pid]: prev.filter((r) => r.id !== id),
          },
        };
      });

      if (postId) await get().fetchReplies(postId);

      return true;
    } catch (e: any) {
      set({ error: axiosErrMessage(e) });
      return false;
    } finally {
      set({ repliesSaving: false });
    }
  },
}));

export default usePublicBoardStore;
